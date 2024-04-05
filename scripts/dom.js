const domPoster = require(p.join(appDir, 'scripts/dom/poster.js')),
	domManager = require(p.join(appDir, 'scripts/dom/dom.js')),
	labels = require(p.join(appDir, 'scripts/dom/labels.js')),
	fileInfo = require(p.join(appDir, 'scripts/dom/file-info.js')),
	search = require(p.join(appDir, 'scripts/dom/search.js'));

/*Page - Index*/

function orderBy(a, b, mode, key = false, key2 = false)
{
	let aValue = a;
	let bValue = b;

	if(key2)
	{
		aValue = a[key][key2];
		bValue = b[key][key2];
	}
	else if(key)
	{
		aValue = a[key];
		bValue = b[key];
	}

	if(mode != 'real-numeric')
	{
		aValue = aValue.toLowerCase();
		bValue = bValue.toLowerCase();
	}

	if(mode == 'simple')
	{
		if (aValue > bValue) return 1;

		if (aValue < bValue) return -1;

		return 0;
	}
	else if(mode == 'real-numeric')
	{
		if (aValue > bValue) return 1;

		if (aValue < bValue) return -1;

		return 0;
	}
	else if(mode == 'numeric')
	{
		let matchA = aValue.match(/([0-9]+)/g);
		let matchB = bValue.match(/([0-9]+)/g);

		if(!matchA) return 1;

		if(!matchB) return -1;

		for(let i = 0, len1 = matchA.length, len2 = matchB.length; i < len1 && i < len2; i++)
		{
			if(+matchA[i] > +matchB[i]) return 1;

			if(+matchA[i] < +matchB[i]) return -1;
		}

		if(matchA.length > matchB.length) return 1;

		if(matchA.length < matchB.length) return -1;

		if(aValue > bValue) return 1;

		if(aValue < bValue) return -1;

		return 0;
	}
	else if(mode == 'simple-numeric')
	{
		let matchA = aValue.match(/([0-9]+|.?)/g);
		let matchB = bValue.match(/([0-9]+|.?)/g);

		if(!matchA) return 1;

		if(!matchB) return -1;

		for (let i = 0, len1 = matchA.length, len2 = matchB.length; i < len1 && i < len2; i++)
		{
			if(isNaN(matchA[i]) || isNaN(matchB[i]))
			{
				if (matchA[i] > matchB[i]) return 1;

				if (matchA[i] < matchB[i]) return -1;
			}
			else
			{
				if (+matchA[i] > +matchB[i]) return 1;

				if (+matchA[i] < +matchB[i]) return -1;
			}
		}

		return (matchA.length < matchB.length) ? 1 : -1;
	}
}


//Get reading progres of path
function getReadingProgress(path, callback)
{
	path = p.normalize(path);

	var readingProgress = storage.getKey('readingProgress');

	for(let rpPath in readingProgress)
	{
		var data = readingProgress[rpPath];

		if(typeof data.progress[path] !== 'undefined')		
			return data;
	}

	return false;
}

function addImageToDom(querySelector, path, animation = true)
{
	let backgroundImage = 'url('+path+')';

	let src = dom.queryAll('.fi-sha-'+querySelector+' img, .sha-'+querySelector+' img, img.fi-sha-'+querySelector).setAttribute('src', path);

	let ri = dom.queryAll('.ri-sha-'+querySelector).setAttribute('src', path);
	let imageBackground = dom.queryAll('.sha-image-bg-'+querySelector).css({backgroundImage: backgroundImage});

	if(animation)
	{
		src.addClass('a', 'border');
		imageBackground.addClass('a');
	}
	else
	{
		src.addClass('border');
		src.filter('.folder-poster-img').addClass('has-poster');
	}
}

function setWindowTitle(title = 'OpenComic')
{
	let _title = document.querySelector('head title');
	_title.innerText = title;
}

function translatePageName(name)
{
	name = name.replace(/^[0-9]+\_sortonly - /, '');

	return name.replace(/^page\-([0-9]+)/, language.global.pageAndNumber);
}

function metadataPathName(file, force = false)
{
	if(file.compressed || force)
	{
		let metadata = storage.getKey('compressedMetadata', file.path);
		if(metadata && metadata.title) return metadata.title;
	}

	return file.name;
}

async function loadFilesIndexPage(file, animation, path, keepScroll, mainPath)
{
	return file.read().then(async function(files){

		queue.clean('folderThumbnails');

		let pathFiles = [];
		let thumbnails = [];

		// Get comic reading progress image
		let _readingProgress = storage.get('readingProgress');

		let readingProgress = _readingProgress[mainPath] || false;
		let readingProgressCurrentPath = (mainPath != path) ? (_readingProgress[path] || false) : false;

		if(files)
		{
			let images = [];

			for(let i = 0, len = files.length; i < len; i++)
			{
				let _file = files[i];

				if(inArray(mime.getType(_file.path), compatibleMime))
				{
					images.push(files[i]);
				}
			}

			if(readingProgress)
			{
				let path = readingProgress.path;
				let sha = sha1(path);

				images.push({path: path, sha: sha});

				readingProgress.sha = sha;
			}

			if(readingProgressCurrentPath)
			{
				let path = readingProgressCurrentPath.path;
				let sha = sha1(path);

				images.push({path: path, sha: sha});

				readingProgressCurrentPath.sha = sha;
			}

			thumbnails = cache.returnThumbnailsImages(images, function(data){

				addImageToDom(data.sha, data.path);

			}, file);

			for(let i = 0, len = files.length; i < len; i++)
			{
				let file = files[i];
				let fileName = file.name;
				let filePath = file.path;

				let realPath = fileManager.realPath(filePath, -1);

				if(inArray(mime.getType(realPath), compatibleMime))
				{
					let sha = file.sha;

					let thumbnail = thumbnails[file.sha];

					pathFiles.push({
						sha: sha,
						name: translatePageName(fileName.replace(/\.[^\.]*$/, '')),
						path: filePath,
						mainPath: mainPath,
						thumbnail: (thumbnail.cache) ? thumbnail.path : '',
						folder: false,
					});
				}
				else if(file.folder || file.compressed)
				{
					let images = await getFolderThumbnails(filePath);

					pathFiles.push({
						sha: file.sha,
						name: metadataPathName(file),
						path: filePath,
						mainPath: mainPath,
						poster: images.poster,
						images: images.images,
						folder: true,
						compressed: file.compressed,
					});
				}
			}
		}
		else
		{
			let images = [];

			if(readingProgress)
			{
				let path = readingProgress.path;
				let sha = sha1(path);

				images.push({path: path, sha: sha});

				readingProgress.sha = sha;
			}

			if(readingProgressCurrentPath)
			{
				let path = readingProgressCurrentPath.path;
				let sha = sha1(path);

				images.push({path: path, sha: sha});

				readingProgressCurrentPath.sha = sha;
			}

			thumbnails = cache.returnThumbnailsImages(images, function(data){

				addImageToDom(data.sha, data.path);

			}, file);
		}

		handlebarsContext.comics = pathFiles;

		// Comic reading progress
		if(readingProgress)
		{
			let sha = readingProgress.sha;
			let thumbnail = thumbnails[sha];

			readingProgress.sha = sha;
			readingProgress.thumbnail = (thumbnail.cache) ? thumbnail.path : '';
			readingProgress.mainPath = mainPath;
			readingProgress.pathText = returnTextPath(readingProgress.path, mainPath, true, !readingProgress.ebook);
			readingProgress.exists = fileManager.simpleExists(readingProgress.path);
			handlebarsContext.comicsReadingProgress = readingProgress;
		}
		else
		{
			handlebarsContext.comicsReadingProgress = false;
		}

		// Current folder reading progress
		if(readingProgressCurrentPath && (!readingProgress || readingProgress.path !== readingProgressCurrentPath.path))
		{
			let sha = readingProgressCurrentPath.sha;
			let thumbnail = thumbnails[sha];

			readingProgressCurrentPath.sha = sha;
			readingProgressCurrentPath.thumbnail = (thumbnail.cache) ? thumbnail.path : '';
			readingProgressCurrentPath.mainPath = mainPath;
			readingProgressCurrentPath.pathText = returnTextPath(readingProgressCurrentPath.path, path, true, !readingProgressCurrentPath.ebook);
			readingProgressCurrentPath.exists = fileManager.simpleExists(readingProgressCurrentPath.path);
			handlebarsContext.comicsReadingProgressCurrentPath = readingProgressCurrentPath;
		}
		else
		{
			handlebarsContext.comicsReadingProgressCurrentPath = false;
		}

		if(!pathFiles.length && fileManager.isServer(path) && serverClient.serverLastError())
		{
			handlebarsContext.serverLastError = true;
			handlebarsContext.serverHasCache = file.serverHasCache(path);
		}

		events.events();

		return {files: pathFiles, readingProgress: readingProgress || {}, readingProgressCurrentPath: readingProgressCurrentPath || {}, html: template.load('index.content.right.'+config.view+'.html')};

	}).catch(function(error){

		console.error(error);
		dom.compressedError(error);

		return {files: [], readingProgress: {}, readingProgressCurrentPath: {}, html: ''};

	});

}

async function reloadIndex(fromSetOfflineMode = false)
{
	indexLabel = prevIndexLabel;
	loadIndexPage(true, indexPathA, true, true, indexMainPathA, false, true, false, fromSetOfflineMode);
	if(indexPathA) indexPathControlA.pop();
}

var indexLabel = false, prevIndexLabel = false;

function setIndexLabel(config)
{
	indexLabel = config;
}

var currentPath = false, currentPathScrollTop = [], fromDeepLoadNow = 0;

async function loadIndexPage(animation = true, path = false, content = false, keepScroll = false, mainPath = false, fromGoBack = false, notAutomaticBrowsing = false, fromDeepLoad = false, fromSetOfflineMode = false)
{
	onReading = _onReading = false;

	reading.hideContent();
	reading.music.pause();

	setWindowTitle();

	currentPathScrollTop[currentPath === false ? 0 : currentPath] = template.contentRight().children().scrollTop();

	for(let _path in currentPathScrollTop)
	{
		if(_path != 0 && !new RegExp('^'+pregQuote(_path)).test(path))
			delete currentPathScrollTop[_path];
	}

	if(currentPathScrollTop[path === false ? 0 : path])
		keepScroll = currentPathScrollTop[path === false ? 0 : path];

	let _indexLabel = prevIndexLabel = (indexLabel || false);
	indexLabel = false;

	currentPath = path;

	handlebarsContext.serverLastError = false;

	let contentRightIndex = template.contentRightIndex();

	if(!path)
	{
		dom.fromLibrary(true);
		dom.indexPathControl(false);

		generateAppMenu();

		if(!fromSetOfflineMode)
			fileManager.setServerInOfflineMode(false);

		let sort = config.sortIndex;
		let sortInvert = config.sortInvertIndex;

		let sortAndView = false;

		if(_indexLabel)
		{
			let labelKey = '';

			if(_indexLabel.favorites)
				labelKey = 'favorites';
			else if(_indexLabel.masterFolder)
				labelKey = 'masterFolder-'+_indexLabel.index;
			else if(_indexLabel.server)
				labelKey = 'server-'+_indexLabel.index;
			else if(_indexLabel.label)
				labelKey = 'label-'+_indexLabel.index;

			sortAndView = config.sortAndView[labelKey] || {
				view: 'module',
				sort: 'name',
				sortInvert: false,
			};

			sort = sortAndView.sort;
			sortInvert = sortAndView.sortInvert;
		}

		let order = '';
		let orderKey = 'name';
		let orderKey2 = false;

		if(sort == 'name')
		{
			order = 'simple';
		}
		else if(sort == 'numeric')
		{
			order = 'numeric';
		}
		else if(sort == 'name-numeric')
		{
			order = 'simple-numeric';
		}
		else if(sort == 'last-add')
		{
			order = 'real-numeric';
			orderKey = 'added';
			sortInvert = !sortInvert;
		}
		else
		{
			order = 'real-numeric';
			orderKey = 'readingProgress';
			orderKey2 = 'lastReading';
			sortInvert = !sortInvert;
		}

		let comics = [];

		// Get comics in master folders
		let masterFolders = storage.get('masterFolders');
		let pathInMasterFolder = {};

		if(!isEmpty(masterFolders))
		{
			for(let key in masterFolders)
			{
				if(fs.existsSync(masterFolders[key]) && (!_indexLabel.masterFolder || _indexLabel.masterFolder == masterFolders[key]) && !_indexLabel.server)
				{
					let file = fileManager.file(masterFolders[key]);
					let files = await file.readDir();
					file.destroy();

					for(let i = 0, len = files.length; i < len; i++)
					{
						let folder = files[i];

						if((folder.folder || folder.compressed) && !pathInMasterFolder[folder.path])
						{
							comics.push({
								name: metadataPathName(folder),
								path: folder.path,
								added: Math.round(fs.statSync(folder.path).mtimeMs / 1000),
								folder: true,
								compressed: folder.compressed,
								fromMasterFolder: true,
							});

							pathInMasterFolder[folder.path] = true;
						}
					}
				}
			}
		}

		// Get server file lists
		let servers = storage.get('servers');

		if(!isEmpty(servers))
		{
			if(_indexLabel.server)
			{
				selectMenuItem(dom.labels.menuItemSelector(isFromIndexLabel ? isFromIndexLabel : _indexLabel));

				handlebarsContext.animationDelay = 0.2;
				template.loadContentRight('index.content.right.loading.html', animation, keepScroll);
				handlebarsContext.animationDelay = false;

				contentRightIndex = template.contentRightIndex();
			}

			for(let i = 0, len = servers.length; i < len; i++)
			{
				if((servers[i].showOnLibrary || _indexLabel.favorites || _indexLabel.label || _indexLabel.server == servers[i].path) && !_indexLabel.masterFolder)
				{
					let file = fileManager.file(servers[i].path);
					if(!_indexLabel.server) file.updateConfig({cacheServer: true});
					let files = await file.readServer();

					let len = files.length;

					for(let i = 0; i < len; i++)
					{
						let folder = files[i];

						if((folder.folder || folder.compressed) && !pathInMasterFolder[folder.path])
						{
							comics.push({
								name: metadataPathName(folder),
								path: folder.path,
								added: folder.mtime,
								folder: true,
								compressed: folder.compressed,
								fromMasterFolder: true,
							});
						}
					}

					if(!len && _indexLabel.server && serverClient.serverLastError())
					{
						handlebarsContext.serverLastError = true;
						handlebarsContext.serverHasCache = file.serverHasCache(servers[i].path);
					}

					file.destroy();
				}
			}
		}

		// Get comics in library
		let comicsStorage = storage.get('comics');

		if(!isEmpty(comicsStorage) && !_indexLabel.masterFolder && !_indexLabel.server)
		{
			for(let key in comicsStorage)
			{
				if(!pathInMasterFolder[comicsStorage[key].path] && fs.existsSync(comicsStorage[key].path))
				{
					comicsStorage[key].name = metadataPathName(comicsStorage[key]);
					comics.push(comicsStorage[key]);
				}
			}
		}

		cache.cleanQueue();
		cache.stopQueue();
		queue.stop('folderThumbnails');

		let len = comics.length;

		if(len && _indexLabel)
		{
			if(_indexLabel.favorites)
			{
				let favorites = storage.get('favorites');
				let _comics = [];

				for(let i = 0; i < len; i++)
				{
					if(favorites[comics[i].path])
						_comics.push(comics[i]);
				}

				comics = _comics;
				len = comics.length;
			}
			else if(_indexLabel.label)
			{
				let labels = storage.get('labels');
				let label = labels[_indexLabel.index] || [];

				let comicLabels = storage.get('comicLabels');
				let _comics = [];

				for(let i = 0; i < len; i++)
				{
					if(comicLabels[comics[i].path] && inArray(label, comicLabels[comics[i].path]))
						_comics.push(comics[i]);
				}

				comics = _comics;
				len = comics.length;
			}
		}

		if(len)
		{
			// Comic reading progress
			let readingProgress = storage.get('readingProgress');

			for(let i = 0; i < len; i++)
			{
				let images = await getFolderThumbnails(comics[i].path);

				comics[i].sha = sha1(comics[i].path);
				comics[i].poster = images.poster;
				comics[i].images = images.images;
				comics[i].mainPath = comics[i].path;
				comics[i].readingProgress = readingProgress[comics[i].path] || {lastReading: 0};
			}

			comics.sort(function (a, b) {
				return (sortInvert) ? -(orderBy(a, b, order, orderKey, orderKey2)) : orderBy(a, b, order, orderKey, orderKey2);
			});
		}

		// Avoid continue if another loadIndexPage has been run
		if(contentRightIndex != template.contentRightIndex()) return;

		handlebarsContext.comics = comics;
		handlebarsContext.comicsIndex = true;
		handlebarsContext.comicsReadingProgress = false;
		dom.setCurrentPageVars('index', _indexLabel);

		template.loadContentRight('index.content.right.'+(sortAndView ? sortAndView.view : config.viewIndex)+'.html', animation, keepScroll);

		cache.resumeQueue();
		queue.resume('folderThumbnails');

		handlebarsContext.headerTitle = false;
		handlebarsContext.headerTitlePath = false;
		dom.loadIndexHeader(_indexLabel ? _indexLabel.name : false, animation);

		if(!content)
		{
			if(template.contentLeft('.menu-list').length === 0) dom.loadIndexContentLeft(animation);
			template.loadGlobalElement('index.elements.menus.html', 'menus');
			floatingActionButton(true, 'dom.addComicButtons();');
		}
		
		if(_indexLabel)
			floatingActionButton(false);

		events.events();

	}
	else
	{
		if(!fromGoBack)
			indexPathControl(path, mainPath);

		generateAppMenu();

		handlebarsContext.comics = [];
		handlebarsContext.comicsIndex = false;
		handlebarsContext.comicsDeep2 = path.replace(new RegExp('^\s*'+pregQuote(mainPathR)), '').split(p.sep).length >= 2 ? true : false;
		dom.setCurrentPageVars('browsing');

		if(handlebarsContext.comicsDeep2)
			showIfHasPrevOrNext(path, mainPath);

		headerPath(path, mainPath);

		if(fromDeepLoad && Date.now() - fromDeepLoadNow < 200)
		{
			template._barHeader().firstElementChild.innerHTML = dom.indexHeader(false);
			// template._contentRight().firstElementChild.innerHTML = template.load('index.content.right.loading.html');
		}
		else
		{
			dom.loadIndexHeader(false, animation);
			template.loadContentRight('index.content.right.loading.html', animation, keepScroll);

			contentRightIndex = template.contentRightIndex();
		}

		if(!content)
		{
			if(readingActive)
			{
				dom.loadIndexContentLeft(animation);
			}

			template.loadGlobalElement('index.elements.menus.html', 'menus');
			floatingActionButton(false);
		}

		cache.cleanQueue();
		cache.stopQueue();
		queue.stop('folderThumbnails');

		// Get comic reading progress image
		let _readingProgress = storage.get('readingProgress');
		let readingProgress = _readingProgress[mainPath] || false;
		let readingProgressCurrentPath = (mainPath != path) ? (_readingProgress[path] || false) : false;

		let isCompressed = fileManager.isCompressed(path);

		let openContinueReading = false;
		let openFirstImage = ((!isCompressed && config.whenOpenFolderFirstImageOrContinueReading) || (isCompressed && config.whenOpenFileFirstImageOrContinueReading)) ? true : false;

		if((config.whenOpenFolderContinueReading || config.whenOpenFileContinueReading || config.whenOpenFolderFirstImageOrContinueReading || config.whenOpenFileFirstImageOrContinueReading) && !fromGoBack && !notAutomaticBrowsing && readingProgress)
		{
			let isParentPath = fileManager.isParentPath(path, readingProgress.path);

			if(isParentPath || readingProgressCurrentPath)
			{
				if(!isParentPath && readingProgressCurrentPath)
					readingProgress = readingProgressCurrentPath;

				if((!isCompressed && (config.whenOpenFolderContinueReading || config.whenOpenFolderFirstImageOrContinueReading)))
					openContinueReading = true;
				else if((isCompressed && (config.whenOpenFileContinueReading || config.whenOpenFileFirstImageOrContinueReading)))
					openContinueReading = true;
			}
		}

		let file = fileManager.file(path);

		if(openContinueReading && !fromGoBack && !notAutomaticBrowsing)
		{
			fromDeepLoadNow = Date.now();
			indexPathControlA.pop();

			if(readingProgress.ebook)
				reading.setNextOpenChapterProgress(readingProgress.chapterIndex, readingProgress.chapterProgress);

			dom.openComic(animation, readingProgress.path, mainPath, false, false, false, true);

			file.destroy();

			return;
		}
		else if(openFirstImage && !fromGoBack && !notAutomaticBrowsing)
		{
			let first;

			try
			{
				first = await file.images(1);
			}
			catch(error)
			{
				console.error(error);
				dom.compressedError(error);

				return;
			}

			if(first)
			{
				fromDeepLoadNow = Date.now();
				indexPathControlA.pop();

				dom.openComic(animation, first.path, mainPath, false, false, false, true);

				file.destroy();

				return;
			}
		}
		
		let indexData = await loadFilesIndexPage(file, animation, path, keepScroll, mainPath);
		file.destroy();

		// Avoid continue if another loadIndexPage has been run
		if(contentRightIndex != template.contentRightIndex()) return;

		if(config.ignoreSingleFoldersLibrary && !fromGoBack && !notAutomaticBrowsing && indexData.files.length == 1 && (indexData.files[0].folder || indexData.files[0].compressed))
		{
			fromDeepLoadNow = Date.now();
			indexPathControlA.pop();

			dom.loadIndexPage(animation, indexData.files[0].path, false, false, indexData.files[0].mainPath, false, false, true);

			return;
		}

		let contentRightScroll = template.contentRight().children().html(indexData.html);

		if(keepScroll > 1)
			contentRightScroll.scrollTop(keepScroll);

		cache.resumeQueue();
		queue.resume('folderThumbnails');
	}

	if(readingActive)
		readingActive = false;

	if(!_indexLabel && !isFromIndexLabel)
	{
		if(!isFromRecentlyOpened)
			selectMenuItem('library');
		else
			selectMenuItem('recently-opened');
	}
	else
	{
		selectMenuItem(dom.labels.menuItemSelector(isFromIndexLabel ? isFromIndexLabel : _indexLabel));
	}

	shortcuts.register('browse');
	gamepad.updateBrowsableItems(path ? sha1(path) : 'library');
}

function loadIndexContentLeft(animation)
{
	// Master folders
	let masterFolders = storage.get('masterFolders');

	let _masterFolders = [];

	for(let i = 0, len = masterFolders.length; i < len; i++)
	{
		_masterFolders.push({
			id: 'masterFolder-'+i,
			key: i,
			name: p.basename(masterFolders[i]),
			path: masterFolders[i],
		});
	}

	_masterFolders.sort(function(a, b){

		if(a.name === b.name)
			return 0;

		return a.name > b.name ? 1 : -1;

	});

	handlebarsContext.masterFolders = _masterFolders;

	// Labels
	let labels = storage.get('labels');

	let _labels = [];

	for(let i = 0, len = labels.length; i < len; i++)
	{
		_labels.push({
			id: 'label-'+i,
			key: i,
			name: labels[i],
		});
	}

	_labels.sort(function(a, b){

		if(a.name === b.name)
			return 0;

		return a.name > b.name ? 1 : -1;

	});

	handlebarsContext.labels = _labels;

	// Servers
	let servers = storage.get('servers');

	let _servers = [];

	for(let i = 0, len = servers.length; i < len; i++)
	{
		_servers.push({
			id: 'server-'+i,
			key: i,
			name: servers[i].name,
			path: servers[i].path,
		});
	}

	_servers.sort(function(a, b){

		if(a.name === b.name)
			return 0;

		return a.name > b.name ? 1 : -1;

	});

	handlebarsContext.servers = _servers;
	handlebarsContext.isFrom = currentSelectMenuItem;

	template.loadContentLeft('index.content.left.html', animation);

	handlebarsContext.isFrom = false;
}

function loadIndexHeader(title = false, animation = true)
{
	handlebarsContext.indexHeaderTitle = title || language.global.comics;
	template.loadHeader('index.header.html', animation);
}

function indexHeader(title = false)
{
	handlebarsContext.indexHeaderTitle = title || language.global.comics;
	return template.load('index.header.html');
}

function continueReadingError()
{
	events.snackbar({
		key: 'continueReadingError',
		text: language.comics.continueReadingNotExists,
		duration: 6,
		buttons: [
			{
				text: language.buttons.dismiss,
				function: 'events.closeSnackbar();',
			},
		],
	});
}

function compressedError(error, showInPage = true, snackbarKey = '')
{
	// console.error(error);

	if(showInPage)
	{
		handlebarsContext.compressedError = error ? (error.detail || error.message) : '';
		handlebarsContext.contentRightMessage = template.load('content.right.message.compressed.error.html');
		template._contentRight().firstElementChild.innerHTML = template.load('content.right.message.html');
	}
	else
	{
		events.snackbar({
			key: 'compressedError'+snackbarKey,
			text: language.error.uncompress.title+(error ? ': '+(error.detail || error.message) : ''),
			duration: 6,
			update: true,
			updateShown: true,
			buttons: [
				{
					text: language.buttons.dismiss,
					function: 'events.closeSnackbar();',
				},
			],
		});
	}
}

function addSepToEnd(path)
{
	if(!new RegExp(pregQuote(p.sep)+'\s*$').test(path))
		path = path + p.sep;

	return path;
}

function returnTextPath(path, mainPath, image = false, extension = true)
{
	mainPathR = addSepToEnd(p.dirname(mainPath));

	let files = path.replace(new RegExp('^\s*'+pregQuote(mainPathR)), '').split(p.sep);
	path = [];

	let _path = mainPathR;

	for(let i = 0, len = files.length; i < len; i++)
	{
		_path = p.normalize(p.join(_path, files[i]));
		files[i] = metadataPathName({path: _path, name: files[i]}, true);

		if(!extension && i == len - 1)
			files[i] = p.parse(files[i]).name;

		path.push(translatePageName(image ? htmlEntities(files[i]) : files[i]));
	}

	return path.join(image ? '<i class="material-icon navegation">chevron_right</i>' : ' / '); 
}

var isFromLibrary = true;

function fromLibrary(value)
{
	isFromLibrary = value;
}

function headerPath(path, mainPath, windowTitle = false)
{
	let _mainPath = mainPath;

	if((config.showFullPathLibrary && isFromLibrary) || (config.showFullPathOpened && !isFromLibrary))
		_mainPath = p.parse(path).root;

	mainPathR = addSepToEnd(p.dirname(_mainPath));

	let files = path.replace(new RegExp('^\s*'+pregQuote(mainPathR)), '').split(p.sep);
	path = [];

	let _path = mainPathR;

	for(let i = 0, len = files.length; i < len; i++)
	{
		_path = p.normalize(p.join(_path, files[i]));
		path.push({name: metadataPathName({path: _path, name: files[i]}, true), path: _path, mainPath: mainPath});
	}

	let len = path.length;

	if(len > 0)
		path[len - 1].last = true;

	if(windowTitle && len > 0)
	{
		let firstCompressedFile = fileManager.firstCompressedFile(_path);
		setWindowTitle(dom.metadataPathName({path: firstCompressedFile, name: p.basename(firstCompressedFile)}, true));
	}

	handlebarsContext.headerTitlePath = path;
}

async function nextComic(path, mainPath)
{
	let file = fileManager.file(mainPath, {cacheServer: true, subtask: true});
	let image = await file.images(1, path);
	file.destroy();

	return image && image.path ? image.path : false;
}

async function previousComic(path, mainPath)
{
	let file = fileManager.file(mainPath, {cacheServer: true, subtask: true});
	let image = await file.images(-1, path);
	file.destroy();

	return image && image.path ? image.path : false;
}

async function goNextComic(path, mainPath)
{
	let _nextComic = await nextComic(indexPathA, indexMainPathA);

	if(_nextComic)
	{
		dom.loadIndexPage(true, p.dirname(_nextComic), false, false, indexMainPathA, false, true);
	}
}

async function goPrevComic(path, mainPath)
{
	let prevComic = await previousComic(indexPathA, indexMainPathA);

	if(prevComic)
	{
		dom.loadIndexPage(true, p.dirname(prevComic), false, false, indexMainPathA, false, true);
	}
}

async function showIfHasPrevOrNext(path, mainPath)
{
	let _nextComic = await nextComic(path, mainPath);
	let prevComic = await previousComic(path, mainPath);

	let barHeader = template._barHeader();

	let buttonNext = barHeader.querySelector('.button-next-comic');
	let buttonPrev = barHeader.querySelector('.button-prev-comic');

	if(buttonNext)
	{
		if(_nextComic)
			buttonNext.classList.remove('disable-pointer');
	}

	if(buttonPrev)
	{
		if(prevComic)
			buttonPrev.classList.remove('disable-pointer');
	}
}

async function _getFolderThumbnails(file, images, _images, path, folderSha, isAsync = false)
{
	let shaIndex = {};

	let poster = false;

	if(Array.isArray(_images))
	{
		if(isAsync) dom.queryAll('.sha-'+folderSha+' .folder-poster').remove();

		for(let i = 0, len = _images.length; i < len; i++)
		{
			_images[i].vars = {i: i};
			shaIndex[i] = _images[i].sha;
		}

		_images = cache.returnThumbnailsImages(_images,  function(data, vars) {

			addImageToDom(data.sha, data.path);
			addImageToDom(folderSha+'-'+vars.i, data.path);

		}, file);

		for(let i = 0, len = images.length; i < len; i++)
		{
			let imageCache = _images[shaIndex[i]];

			if(imageCache && imageCache.cache)
			{
				images[i].path = imageCache.path;
				images[i].cache = true;

				if(isAsync)
				{
					addImageToDom(imageCache.sha, imageCache.path);
					addImageToDom(folderSha+'-'+i, imageCache.path);
				}
			}
		}
	}
	else
	{
		if(isAsync) dom.queryAll('.sha-'+folderSha+' .folder-images').remove();

		poster = cache.returnThumbnailsImages({path: _images.path, sha: _images.sha, type: 'poster'}, function(data){

			addImageToDom(data.sha, data.path);
			addImageToDom(folderSha+'-0', data.path);

		}, file);

		if(isAsync && poster.path)
		{
			addImageToDom(poster.sha, poster.path);
			addImageToDom(folderSha+'-0', poster.path);
		}

		poster.sha = folderSha+'-0';

		images = false;
	}

	return {poster: poster, images: images};
}

async function getFolderThumbnails(path)
{
	let folderSha = sha1(path);

	let poster = {cache: false, path: '', sha: folderSha+'-0'};

	let images = [
		{cache: false, path: '', sha: folderSha+'-0'},
		{cache: false, path: '', sha: folderSha+'-1'},
		{cache: false, path: '', sha: folderSha+'-2'},
		{cache: false, path: '', sha: folderSha+'-3'},
	];
	
	try
	{
		let file = fileManager.file(path, {fromThumbnailsGeneration: true, subtask: true});
		file.updateConfig({cacheOnly: true});
		let _images = await file.images(4, false, true);

		_images = await _getFolderThumbnails(file, images, _images, path, folderSha);

		file.destroy();

		poster = _images.poster;
		images = _images.poster ? false : _images.images;
	}
	catch(error)
	{
		if(error.message && /notCacheOnly/.test(error.message))
		{
			queue.add('folderThumbnails', async function(path, folderSha) {

				console.log(path);

				let file = fileManager.file(path, {fromThumbnailsGeneration: true, subtask: true});
				let _images = await file.images(4, false, true);

				await _getFolderThumbnails(file, images, _images, path, folderSha, true);

				file.destroy();

				return;

			}, path, folderSha);
		}
		else
		{
			console.error(error);
			dom.compressedError(error, false);
		}
	}

	return {poster: poster, images: images};
}

var indexPathControlA = [], indexPathA = false, indexMainPathA = false;

function indexPathControlGoBack()
{
	if(indexPathControlA.length == 1)
	{
		if(isFromIndexLabel && !isFromRecentlyOpened)
			indexLabel = isFromIndexLabel;

		if(isFromRecentlyOpened)
			recentlyOpened.load(true);
		else
			loadIndexPage(true, false);
	}
	else if(indexPathControlA.length > 0)
	{
		let goBack = indexPathControlA[indexPathControlA.length - 2];

		indexLabel = goBack.indexLabel;

		if(goBack.isComic)
			openComic(true, goBack.path, goBack.mainPath, false, true);
		else
			loadIndexPage(true, goBack.path, false, false, goBack.mainPath, true);

		indexPathControlA.pop();

		indexPathA = goBack.path;
		indexMainPathA = goBack.mainPath;
	}
}

function indexPathControlUpdateLastComic(path = false)
{
	let index = indexPathControlA.length - 1;
	let last = indexPathControlA[index];

	if(last.isComic && p.normalize(p.dirname(last.path)) === p.normalize(p.dirname(path)))
	{
		indexPathControlA[index].file = p.basename(path);
		indexPathControlA[index].path = path;
	}
}

var barBackStatus = false, isFromRecentlyOpened = false, isFromIndexLabel = false;

// This needs to be improved more, if is from fromNextAndPrev, consider changing the previous route/path
function indexPathControl(path = false, mainPath = false, isComic = false, fromNextAndPrev = false, fromRecentlyOpened = false)
{
	indexPathA = path;
	indexMainPathA = mainPath;

	if(path === false || mainPath === false)
	{
		indexPathControlA = [];

		isFromRecentlyOpened = handlebarsContext.isFromRecentlyOpened = fromRecentlyOpened;
		isFromIndexLabel = prevIndexLabel;
	}
	else
	{
		mainPathR = addSepToEnd(p.dirname(mainPath));

		let files = path.replace(new RegExp('^\s*'+pregQuote(mainPathR)), '').split(p.sep);

		let index = files.length - 1;

		let len = indexPathControlA.length;

		if(index >= 0)
		{
			if(len > 0 && isComic && fromNextAndPrev && indexPathControlA[len-1].isComic) // 
				indexPathControlA[len-1] = {file: files[index], path: path, mainPath: mainPath, isComic: isComic};
			else
				indexPathControlA.push({file: files[index], path: path, mainPath: mainPath, isComic: isComic});
		}
	}

	if(indexPathControlA.length > 0)
	{
		if(!barBackStatus)
		{
			handlebarsContext['bar-back'] = 'show';
			$('.bar-back').removeClass('disable active').addClass('show');
		}
		else
		{
			handlebarsContext['bar-back'] = 'active';
		}

		barBackStatus = true;
	}
	else
	{
		if(barBackStatus)
		{
			handlebarsContext['bar-back'] = 'disable';
			$('.bar-back').removeClass('active show').addClass('disable');
		}
		else
		{
			handlebarsContext['bar-back'] = '';
		}

		barBackStatus = false;
	}
}

/* Page - Settings */

function loadRecentlyOpened(animation = true)
{
	indexPathControl(false);
	selectMenuItem('recently-opened');

	onReading = _onReading = false;

	reading.hideContent();

	generateAppMenu();

	recentlyOpened.load(animation);

	if(readingActive)
		readingActive = false;
}

/* Page - Theme */

/*Page - Languages*/

function loadLanguagesPage(animation = true)
{
	indexPathControl(false);
	selectMenuItem('language');

	onReading = _onReading = false;

	reading.hideContent();

	generateAppMenu();

	if(typeof handlebarsContext.languagesList == 'undefined')
	{
		var languagesList = $.parseJSON(readFileApp('/languages/languagesList.json'));

		handlebarsContext.languagesList = [];

		for(let code in languagesList)
		{
			if(typeof languagesList[code].active != 'undefined' && languagesList[code].active)
			{
				handlebarsContext.languagesList.push({code: code, name: languagesList[code].name, nativeName: languagesList[code].nativeName});
			}
		}
	}

	handlebarsContext.languagesList.sort(function(a, b) {
		
		if(a.nativeName == b.nativeName)
			return 0;

		return a.nativeName > b.nativeName ? 1 : -1;
		
	});

	template.loadContentRight('languages.content.right.html', animation);
	template.loadHeader('languages.header.html', animation);
	template.loadGlobalElement('general.elements.menus.html', 'menus');
	floatingActionButton(false);

	events.events();
	gamepad.updateBrowsableItems('languagesPage');

	if(readingActive)
		readingActive = false;
}

function changeLanguage(lan)
{
	loadLanguage(lan);
	
	template.contentRight('.language-list.active').removeClass('active');
	template.contentRight('.language-list-'+lan).addClass('active');

	dom.loadIndexContentLeft(false);
	template.loadHeader('languages.header.html', false);
	storage.updateVar('config', 'language', lan);

	gamepad.updateBrowsableItems(gamepad.currentKey());
}

/* Page - Settings */

function loadSettingsPage(animation = true)
{
	indexPathControl(false);
	selectMenuItem('settings');

	onReading = _onReading = false;

	reading.hideContent();

	generateAppMenu();

	settings.start();

	template.loadContentRight('settings.content.right.html', animation);
	template.loadHeader('settings.header.html', animation);
	template.loadGlobalElement('general.elements.menus.html', 'menus');
	floatingActionButton(false);

	settings.startSecond();

	if(readingActive)
		readingActive = false;
}

/* Page - Theme */

function loadThemePage(animation = true)
{
	indexPathControl(false);
	selectMenuItem('theme');

	onReading = _onReading = false;

	reading.hideContent();

	generateAppMenu();

	//template.loadContentRight('theme.content.right.html', animation);
	template.loadHeader('theme.header.html', animation);
	template.loadGlobalElement('general.elements.menus.html', 'menus');
	floatingActionButton(false);

	theme.start();

	if(readingActive)
		readingActive = false;
}

var currentSelectMenuItem = false;

function selectMenuItem(page)
{
	currentSelectMenuItem = page;
	let contentLeft = template._contentLeft();

	let active = contentLeft.querySelector('.menu-item.active');
	if(active) active.classList.remove('active');

	page = contentLeft.querySelector('.menu-item-'+page);
	if(page) page.classList.add('active');
}

var addComicButtonsST = false, addComicButtonsActive = false;

function addComicButtons(show = true, first = true)
{
	clearTimeout(addComicButtonsST);

	if(show)
	{
		var more = false, have = false;

		$($('.floating-action-button-min').get().reverse()).each(function(){

			if(!$(this).hasClass('s'))
			{
				if(!have)
					$(this).removeClass('h').addClass('s');
				else
					more = true;

				have = true;
			}

		});

		if(more)
			addComicButtonsST = setTimeout(function(){addComicButtons(true, false)}, 50);

		if(first)
		{
			floatingActionButton(true, 'dom.addComicButtons(false);');
			$('.floating-action-button-add > div').css('transform', 'rotate(135deg)');
		}

		addComicButtonsActive = true;
	}
	else
	{
		var more = false, have = false;

		$('.floating-action-button-min').each(function(){

			if(!$(this).hasClass('h'))
			{
				if(!have)
					$(this).removeClass('s').addClass('h');
				else
					more = true;

				have = true;
			}

		});

		if(more)
			addComicButtonsST = setTimeout(function(){addComicButtons(false, false)}, 50);

		if(first)
		{
			floatingActionButton(true, 'dom.addComicButtons();');
			$('.floating-action-button-add > div').css('transform', '');
		}

		addComicButtonsActive = false;
	}
}

function floatingActionButton(active, callback)
{
	if(active)
	{
		$('.floating-action-button-add').removeClass('disable').attr('onclick', callback);
	}
	else
	{
		if(addComicButtonsActive)
			addComicButtons(false);

		$('.floating-action-button-add').addClass('disable');
	}
}

function setCurrentPageVars(page, _indexLabel = false)
{
	let labelKey = false;
	let sortAndView = false;

	let key = page;

	if(_indexLabel)
	{
		if(_indexLabel.favorites)
		{
			labelKey = key = 'favorites';
		}
		else if(_indexLabel.masterFolder)
		{
			labelKey = 'masterFolder-'+_indexLabel.index;
			key = 'masterFolder';
		}
		else if(_indexLabel.server)
		{
			labelKey = 'server-'+_indexLabel.index;
			key = 'server';
		}
		else if(_indexLabel.label)
		{
			labelKey = 'label-'+_indexLabel.index;
			key = 'label';
		}

		sortAndView = config.sortAndView[labelKey] || {
			view: 'module',
			sort: 'name',
			sortInvert: false,
		};
	}

	let extraKey = '';

	if(page == 'recently-opened')
		extraKey = 'RecentlyOpened';
	else if(page == 'index')
		extraKey = 'Index';

	handlebarsContext.page = {
		key: key,
		name: labelKey ? labelKey : page,
		view: sortAndView ? sortAndView.view : config['view'+extraKey],
		sort: sortAndView ? sortAndView.sort : config['sort'+extraKey],
		sortInvert: sortAndView ? sortAndView.sortInvert : config['sortInvert'+extraKey],
		foldersFirst: sortAndView ? false : (config['foldersFirst'+extraKey] || false),
	};
}

function changeView(mode, page)
{
	let labelKey = false;
	let sortAndView = false;

	if(/favorites|masterFolder|server|label/.test(page))
	{
		labelKey = page;

		sortAndView = config.sortAndView[labelKey] || {
			view: 'module',
			sort: 'name',
			sortInvert: false,
		};
	}

	let changed = false;

	if(sortAndView)
	{
		if(mode != sortAndView.view)
		{
			sortAndView.view = mode;
			config.sortAndView[labelKey] = sortAndView;

			storage.updateVar('config', 'sortAndView', config.sortAndView);
			selectElement('.view-'+mode);
			changed = true;
		}
	}
	else
	{
		let extraKey = '';

		if(page == 'recently-opened')
			extraKey = 'RecentlyOpened';
		else if(page == 'index')
			extraKey = 'Index';

		if(mode != config['view'+extraKey])
		{
			storage.updateVar('config', 'view'+extraKey, mode);
			selectElement('.view-'+mode);
			changed = true;
		}
	}

	if(changed)
	{
		if(page == 'recently-opened')
			recentlyOpened.reload();
		else
			reloadIndex();
	}
}

function changeSort(type, mode, page)
{
	let labelKey = false;
	let sortAndView = false;

	if(/favorites|masterFolder|server|label/.test(page))
	{
		labelKey = page;

		sortAndView = config.sortAndView[labelKey] || {
			view: 'module',
			sort: 'name',
			sortInvert: false,
		};
	}

	let changed = false;

	if(sortAndView)
	{
		if(type == 1)
		{
			if(mode != sortAndView.sort)
			{
				sortAndView.sort = mode;
				changed = true;
			}
		}
		else if(type == 2)
		{
			if(mode != sortAndView.sortInvert)
			{
				sortAndView.sortInvert = mode;
				changed = true;
			}
		}

		if(changed)
		{
			config.sortAndView[labelKey] = sortAndView;

			storage.updateVar('config', 'sortAndView', config.sortAndView);
			selectElement('.sort-'+mode);
		}
	}
	else
	{
		let extraKey = '';

		if(page == 'recently-opened')
			extraKey = 'RecentlyOpened';
		else if(page == 'index')
			extraKey = 'Index';

		if(type == 1)
		{
			if(mode != config['sort'+extraKey])
			{
				storage.updateVar('config', 'sort'+extraKey, mode);
				selectElement('.sort-'+mode);
				changed = true;
			}
		}
		else if(type == 2)
		{
			if(mode != config['sortInvert'+extraKey])
			{
				storage.updateVar('config', 'sortInvert'+extraKey, mode);
				selectElement('.sort-'+mode);
				changed = true;
			}
		}
		else if(type == 3)
		{
			if(mode != config['foldersFirst'+extraKey])
			{
				storage.updateVar('config', 'foldersFirst'+extraKey, mode);
				selectElement('.sort-'+mode);
				changed = true;
			}
		}
	}

	if(changed)
	{
		if(page == 'recently-opened')
			recentlyOpened.reload();
		else
			reloadIndex();
	}
}

function selectElement(element)
{
	$(element).parent().children().removeClass('s');
	$(element).addClass('s');
}

//Enable/Disable night mode

function nightMode(force = null)
{
	let _app = document.querySelector('.app');

	if((force === null && _app.classList.contains('night-mode')) || force === false)
	{
		_app.classList.remove('night-mode');
		dom.queryAll('.button-night-mode').html('light_mode');
		handlebarsContext.nightMode = false;
		storage.updateVar('config', 'nightMode', false);
	}
	else
	{
		_app.classList.add('night-mode');
		dom.queryAll('.button-night-mode').html('dark_mode');
		handlebarsContext.nightMode = true;
		storage.updateVar('config', 'nightMode', true);
	}

	titleBar.setColors();
}

// Show the comic context menu
async function comicContextMenu(path, fromIndex = true, fromIndexNotMasterFolders = true, folder = false, gamepad = false)
{	
	let isServer = fileManager.isServer(path);
	if(!fromIndex && isServer) return;

	dom.query('#index-context-menu .separator-remove').css({display: fromIndexNotMasterFolders ? 'block' : 'none'});

	// Remove
	let remove = document.querySelector('#index-context-menu .context-menu-remove');

	if(fromIndexNotMasterFolders)
	{
		remove.style.display = 'block';
		remove.setAttribute('onclick', 'dom.removeComic(\''+escapeQuotes(escapeBackSlash(path), 'simples')+'\');');
	}
	else
	{
		remove.style.display = 'none';
	}

	dom.query('#index-context-menu .separator-labels').css({display: fromIndex ? 'block' : 'none'});

	// Favorite
	let favorite = document.querySelector('#index-context-menu .context-menu-favorite');

	if(fromIndex)
	{
		let favorites = storage.get('favorites');
		let isFavorte = favorites[path] ? true : false;

		favorite.style.display = 'block';
		favorite.setAttribute('onclick', 'dom.labels.setFavorite(\''+escapeQuotes(escapeBackSlash(path), 'simples')+'\');');

		if(isFavorte)
			favorite.querySelector('i').classList.add('fill');
		else
			favorite.querySelector('i').classList.remove('fill');
	}
	else
	{
		favorite.style.display = 'none';
	}

	// Labels
	let labels = document.querySelector('#index-context-menu .context-menu-labels');

	if(fromIndex)
	{
		let comicLabels = storage.get('comicLabels');
		let hasLabels = comicLabels[path] ? true : false;

		labels.style.display = 'block';
		labels.setAttribute('onclick', 'dom.labels.setLabels(\''+escapeQuotes(escapeBackSlash(path), 'simples')+'\');');

		if(hasLabels)
			labels.querySelector('i').classList.add('fill');
		else
			labels.querySelector('i').classList.remove('fill');
	}
	else
	{
		labels.style.display = 'none';
	}

	if(isServer)
	{
		dom.query('#index-context-menu .separator-poster').css({display: 'none'});

		let openFileLocation = document.querySelector('#index-context-menu .context-menu-open-file-location');
		let addPoster = document.querySelector('#index-context-menu .context-menu-add-poster');
		let deletePoster = document.querySelector('#index-context-menu .context-menu-delete-poster');

		openFileLocation.style.display = 'none';
		addPoster.style.display = 'none';
		deletePoster.style.display = 'none';
	}
	else
	{
		dom.query('#index-context-menu .separator-poster').css({display: folder ? 'block' : 'none'});

		// Open file location
		let openFileLocation = document.querySelector('#index-context-menu .context-menu-open-file-location');
		openFileLocation.setAttribute('onclick', 'electron.shell.showItemInFolder(\''+escapeQuotes(escapeBackSlash(fileManager.firstCompressedFile(path)), 'simples')+'\');');
		openFileLocation.style.display = 'block';

		// Add poster and delete
		let addPoster = document.querySelector('#index-context-menu .context-menu-add-poster');
		let deletePoster = document.querySelector('#index-context-menu .context-menu-delete-poster');
		addPoster.style.display = 'block';
		deletePoster.style.display = 'block';

		if(folder)
		{
			addPoster.style.display = 'block';

			let images = [];

			try
			{
				let file = fileManager.file(path, {subtask: true});
				images = await file.images(2, false, true);
				file.destroy();
			}
			catch{}

			let poster = !Array.isArray(images) ? images : false;

			addPoster.setAttribute('onclick', 'dom.poster.add('+(fromIndexNotMasterFolders ? 'true' : 'false')+', \''+escapeQuotes(escapeBackSlash(path), 'simples')+'\', '+(poster ? '\''+escapeQuotes(escapeBackSlash(poster.path), 'simples')+'\'' : 'false')+');');
			addPoster.querySelector('span').innerHTML = poster ? language.global.contextMenu.changePoster : language.global.contextMenu.addPoster;

			if(poster && !poster.fromFirstImageAsPoster)
			{
				deletePoster.style.display = 'block';
				deletePoster.setAttribute('onclick', 'dom.poster.delete(\''+escapeQuotes(escapeBackSlash(poster.path), 'simples')+'\');');
			}
			else
			{
				deletePoster.style.display = 'none';
			}

			openFileLocation.querySelector('span').innerHTML = language.global.contextMenu.openFolderLocation;
		}
		else
		{
			addPoster.style.display = 'none';
			deletePoster.style.display = 'none';

			openFileLocation.querySelector('span').innerHTML = language.global.contextMenu.openFileLocation;
		}
	}

	// File info
	let fileInfo = document.querySelector('#index-context-menu .context-menu-file-info');

	fileInfo.setAttribute('onclick', 'dom.fileInfo.show(\''+escapeQuotes(escapeBackSlash(path), 'simples')+'\');');
	fileInfo.style.display = folder ? 'block' : 'none';


	if(gamepad)
		events.activeMenu('#index-context-menu', false, 'gamepad');
	else
		events.activeContextMenu('#index-context-menu');
}

// Remove the comic from OpenComic
function removeComic(path, confirm = false)
{
	var _comics = [], comics = storage.get('comics');

	for(let i in comics)
	{
		if(comics[i].path != path)
			_comics.push(comics[i]);
	}

	storage.update('comics', _comics);

	dom.loadIndexPage(true, false, true, true);
}

var readingActive = false, skipNextComic = false, skipPreviousComic = false;

async function openComic(animation = true, path = true, mainPath = true, end = false, fromGoBack = false, fromNextAndPrev = false, fromDeepLoad = false)
{
	// Start reading comic
	if(config.readingStartReadingInFullScreen && !fromNextAndPrev && !fromGoBack)
	{
		let win = electronRemote.getCurrentWindow();
		let isFullScreen = win.isFullScreen();

		if(!isFullScreen)
		{
			reading.hideContent(!isFullScreen);
			win.setFullScreen(!isFullScreen);
			win.setMenuBarVisibility(isFullScreen);
		}
	}

	onReading = _onReading = true;

	currentPathScrollTop[currentPath === false ? 0 : currentPath] = template.contentRight().children().scrollTop();
	currentPath = path;

	let now = Date.now();

	let startImage = false;
	let imagePath = path;
	let indexStart = 1;

	if(compatibleMime.indexOf(mime.getType(path)) != -1)
	{
		startImage = path;
		path = p.dirname(path);
	}

	// Show loadign page
	headerPath(path, mainPath, true);

	// Load files
	let file = fileManager.file(path);
	let files = [];

	try
	{
		files = await file.read({filtered: false});
	}
	catch(error)
	{
		console.error(error);
		dom.compressedError(error);

		return;
	}

	let hasMusic = await reading.music.has(files);
	handlebarsContext.hasMusic = hasMusic;

	files = fileManager.filtered(files);

	handlebarsContext.comics = [];

	if(fromDeepLoad && Date.now() - fromDeepLoadNow < 200)
	{
		template._barHeader().firstElementChild.innerHTML = template.load('reading.header.html');
	}
	else
	{
		if(!template._contentRight().querySelector('.loading'))
		{
			handlebarsContext.loading = true;
			template.loadContentRight('reading.content.right.html', animation);
		}

		template.loadHeader('reading.header.html', animation);
	}

	template.loadContentLeft('reading.content.left.html', animation);

	let isCanvas = false;
	let isEbook = false;
	let compressedFile = fileManager.lastCompressedFile(path);

	if(hasMusic) files.push(hasMusic); // Only to make available

	if(compressedFile)
	{
		let features = fileManager.fileCompressed(compressedFile);
		features = features.getFeatures();

		if(features.canvas)
		{
			await file.makeAvailable([{path: compressedFile}]);
			isCanvas = true;
		}
		else if(features.ebook)
		{
			await file.makeAvailable([{path: compressedFile}]);
			isEbook = true;
			// files = [];
		}
		else
		{
			await file.makeAvailable(files);
		}
	}
	else if(fileManager.isServer(path))
	{
		await file.makeAvailable(files, false, true);
	}

	if(hasMusic) files.pop(); // Remove now

	file.destroy();

	skipNextComic = await nextComic(path, mainPath);
	skipPreviousComic = await previousComic(path, mainPath);

	// The user has gone back before finishing loading
	if(!onReading)
		return;

	if(!fromGoBack)
		indexPathControl(imagePath, mainPath, true, fromNextAndPrev);

	readingActive = true;

	cache.cleanQueue();
	cache.stopQueue();

	let comics = [];

	if(files)
	{
		let len = files.length;
		let images = [];

		for(let i = 0; i < len; i++)
		{
			let file = files[i];

			if(!file.folder && !file.compressed)
				images.push(file);
		}

		let thumbnails = cache.returnThumbnailsImages(images, function(data) {

			addImageToDom(data.sha, data.path);

		}, file);

		for(let i = 0; i < len; i++)
		{
			let file = files[i];

			if(file.folder || file.compressed)
			{
				let fileImage = fileManager.file(file.path);
				let images = await fileImage.images(4);
				fileImage.destroy();

				if(images.length > 0)
				{
					comics.push({
						name: file.name,
						path: file.path,
						mainPath: mainPath,
						fristImage: images[0].path,
						images: images,
						folder: true,
					});
				}
			}
			else
			{
				let thumbnail = thumbnails[file.sha] || {};

				comics.push({
					sha: file.sha,
					name: file.name.replace(/\.[^\.]*$/, ''),
					image: fileManager.realPath(file.path),
					path: file.path,
					mainPath: mainPath,
					thumbnail: (thumbnail.cache) ? thumbnail.path : '',
					size: file.size || false,
					canvas: isCanvas,
					ebook: isEbook,
					folder: false,
				});		
			}
		}
	}

	for(let i = 0, len = comics.length; i < len; i++)
	{
		comics[i].index = i + 1;

		if(comics[i].path == imagePath)
			indexStart = comics[i].index;
	}

	if(isEbook)
		comics = [];

	handlebarsContext.comics = comics;
	handlebarsContext.previousComic = skipPreviousComic;
	handlebarsContext.nextComic = skipNextComic;
	reading.setCurrentComics(comics);

	handlebarsContext.loading = true;

	if(Date.now() - now < 200)
	{
		if(template._contentRight().querySelector('.loading') && !template._contentRight().querySelector('.reading-body'))
		{
			handlebarsContext.loading = false;
			template._contentRight().firstElementChild.insertAdjacentHTML('beforeend', template.load('reading.content.right.html'));
		}
		else
		{
			template._contentRight().firstElementChild.innerHTML = template.load('reading.content.right.html');
		}

		template._contentLeft().firstElementChild.innerHTML = template.load('reading.content.left.html');
	}
	else
	{
		template.loadContentLeft('reading.content.left.html', animation);
		template.loadContentRight('reading.content.right.html', animation);
	}

	template._contentLeft().firstElementChild.style.height = 'calc(100% - 66px)';

	if(template.globalElement('.reading-elements-menus').length == 0) template.loadGlobalElement('reading.elements.menus.html', 'menus');

	floatingActionButton(false);
	
	events.events();

	reading.onLoad(function(){

		cache.resumeQueue();

	});

	reading.read(path, indexStart, end, isCanvas, isEbook, imagePath);
	reading.hideContent(electronRemote.getCurrentWindow().isFullScreen(), true);
	reading.music.read(hasMusic);

	generateAppMenu();
	
	shortcuts.register('reading');
	gamepad.updateBrowsableItems('reading-'+sha1(path));
}

// Gamepad events
gamepad.setButtonEvent('reading', 1, function(key, button) {

	if(key == 1 && (!onReading || document.querySelector('.menu-simple.a')))
		gamepad.goBack();

});

module.exports = {
	loadIndexPage: loadIndexPage,
	loadIndexContentLeft: loadIndexContentLeft,
	loadIndexHeader: loadIndexHeader,
	indexHeader: indexHeader,
	setIndexLabel: setIndexLabel,
	prevIndexLabel: function(){return prevIndexLabel},
	reloadIndex: reloadIndex,
	loadRecentlyOpened: loadRecentlyOpened,
	loadLanguagesPage: loadLanguagesPage,
	loadSettingsPage: loadSettingsPage,
	loadThemePage: loadThemePage,
	changeLanguage: changeLanguage,
	selectMenuItem: selectMenuItem,
	floatingActionButton: floatingActionButton,
	setCurrentPageVars: setCurrentPageVars,
	changeView: changeView,
	changeSort: changeSort,
	indexPathControl: indexPathControl,
	indexPathControlA: function(){return indexPathControlA},
	indexPathControlGoBack: indexPathControlGoBack,
	selectElement: selectElement,
	openComic: openComic,
	nextComic: function(){return skipNextComic},
	previousComic: function(){return skipPreviousComic},
	goNextComic: goNextComic,
	goPrevComic: goPrevComic,
	orderBy: orderBy,
	nightMode: nightMode,
	addComicButtons: addComicButtons,
	comicContextMenu: comicContextMenu,
	removeComic: removeComic,
	compressedError: compressedError,
	addImageToDom: addImageToDom,
	addSepToEnd: addSepToEnd,
	indexPathControlUpdateLastComic: indexPathControlUpdateLastComic,
	indexPathA: function(){return indexPathA},
	indexMainPathA: function(){return indexMainPathA},
	currentPathScrollTop: function(){return currentPathScrollTop},
	getFolderThumbnails: getFolderThumbnails,
	translatePageName: translatePageName,
	metadataPathName: metadataPathName,
	setWindowTitle: setWindowTitle,
	fromLibrary: fromLibrary,
	continueReadingError: continueReadingError,
	poster: domPoster,
	search: search,
	labels: labels,
	fileInfo: fileInfo,
	this: domManager.this,
	query: domManager.query,
	queryAll: domManager.queryAll,
};
