/**
 _____ _   _ ____  _____    _ ____   _    _  __
|  ___| | | / ___|| ____|  | |  _ \ / \  | |/ /
| |_  | | | \___ \|  _| _  | | |_) / _ \ | ' / 
|  _| | |_| |___) | |__| |_| |  __/ ___ \| . \ 
|_|    \___/|____/|_____\___/|_| /_/   \_\_|\_\
                                                  
Multiuse Javascript Package
https://github.com/TeskeVirtualSystem/fusejpak

The MIT License (MIT)

Copyright (c) 2013 Lucas Teske

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**/


(function() {

  var f4js = require('fuse4js');

  var FuseJPAK = function(filename, mountPoint) {
    var _this = this;
    this.filename = filename;
    this.mountPoint = mountPoint;
    this.jpak = new JPAK.Loader({"file":filename});
    
    this.handlers = {
      getattr:  function() { _this._fuseGetAttr.apply(_this, arguments);  },
      readdir:  function() { _this._fuseReadDir.apply(_this, arguments);  },
      open:     function() { _this._fuseOpen.apply(_this, arguments);     },
      read:     function() { _this._fuseRead.apply(_this, arguments);     },
      write:    function() { _this._fuseWrite.apply(_this, arguments);    },
      release:  function() { _this._fuseRelease.apply(_this, arguments);  },
      create:   function() { _this._fuseCreate.apply(_this, arguments);   },
      unlink:   function() { _this._fuseUnlink.apply(_this, arguments);   },
      rename:   function() { _this._fuseRename.apply(_this, arguments);   },
      mkdir:    function() { _this._fuseMakeDir.apply(_this, arguments);  },
      rmdir:    function() { _this._fuseRemoveDir.apply(_this, arguments);},
      init:     function() { _this._fuseInit.apply(_this, arguments);     },
      destroy:  function() { _this._fuseDestroy.apply(_this, arguments);  },
      setxattr: function() { _this._fuseSetXAttr.apply(_this, arguments); },
      statfs:   function() { _this._fuseStatFS.apply(_this, arguments);   }
    };

    f4js.start(mountPoint, this.handlers, true, []);
  };

  FuseJPAK.prototype._fuseInit = function(fusecb) {
    console.log("File system started at " + this.mountPoint);
    console.log("To stop it, type this in another shell: fusermount -u " + this.mountPoint);
    this.jpak.load().then(function() {
      console.log("JPAK Loaded");
      fusecb();
    });
  };

  FuseJPAK.prototype._fuseGetAttr = function (path, fusecb) {  
    var stat = {};
    var err = 0;
    var info = this.jpak.findDirectoryEntry(path);
    if (info === null) 
      info = this.jpak.findFileEntry(path);

    if (info === null || info === undefined)
      err = -2;
    else {
      if (info.hasOwnProperty("directories")) {
        stat.size = 4096;
        stat.mode = 040555; //  For now, always read only
      } else {
        stat.size = info.size;
        stat.mode = 0100555; // For now, always read only
      }
    }
    console.log("_fuseGetAttr("+err+","+stat+") for "+path);
    fusecb( err, stat );
  };

  FuseJPAK.prototype._fuseReadDir = function(path, fusecb) {
    var names = [];
    var err = 0; // assume success
    var info = this.jpak.findDirectoryEntry(path);

    if (info === null) {
      info = this.jpak.findFileEntry(path);
      if (info !== null)
        fusecb(-22, []);  //  Invalid Method
      else
        fusecb(-2, []);   //  Not exists;

      return;
    }

    for (var dir in info.directories)
      names.push(info.directories[dir].name);

    for (var file in info.files)
      names.push(info.files[file].name);

    console.log("_fuseReadDir("+err+",",names,")");
    fusecb( err, names );
  };

  FuseJPAK.prototype._fuseOpen = function(path, flags, fusecb) {
    console.log("_fuseOpen("+path+","+flags+")");
    var err = 0; // assume success
    var info = this.jpak.findFileEntry(path);
    
    if (info === null)
      err = -2; // File not found
    

    fusecb(err); // we don't return a file handle, so fuse4js will initialize it to 0
  };

  FuseJPAK.prototype._fuseRead = function (path, offset, len, buf, fh, fusecb) {
    var err = 0; // assume success
    var info = this.jpak.findFileEntry(path);
    var maxBytes;
    var data;

    console.log("_fuseRead("+path+","+offset+","+len+",[Buffer Object],"+fh+")");

    if (info === null)
      fusecb(-2);  // FIle not found
    else {
      if (offset < info.size) {
        maxBytes = info.size - offset;
        if (len > maxBytes) {
          len = maxBytes;
        }
        this.jpak.getFileArrayBuffer(path, null, offset, len).then(function(data) {
          data = new Uint8Array(data);
          // TODO: Faster way
          for(var i=0;i<data.byteLength;i++)
            buf.writeUInt8(data.get(i), i);
          fusecb(len);
        }).fail(function(err) {
          console.error(err);
          fusecb(0);
        });
      }
    }
  };

  FuseJPAK.prototype._fuseWrite = function (path, offset, len, buf, fh, fusecb) {
    console.error("_fuseWrite("+path+") - Not Implemented");
    fusecb(-1); //  Always access denied
  };

  FuseJPAK.prototype._fuseRelease = function(path, fh, fusecb) {
    fusecb(0);
  };

  FuseJPAK.prototype._fuseCreate = function(path, mode, fusecb) {
    console.error("_fuseCreate("+path+") - Not Implemented");
    fusecb(-1); //  Always access denied
  };

  FuseJPAK.prototype._fuseUnlink = function(path, fusecb) {
    console.error("_fuseUnlink("+path+") - Not Implemented");
    fusecb(-1); //  Always access denied
  };

  FuseJPAK.prototype._fuseRename = function(src, dest, fusecb) {
    console.error("_fuseRename("+path+") - Not Implemented");
    fusecb(-1); //  Always access denied
  };

  FuseJPAK.prototype._fuseMakeDir = function(path, mode, fusecb) {
    console.error("_fuseMakeDir("+path+") - Not Implemented");
    fusecb(-1); //  Always access denied
  };

  FuseJPAK.prototype._fuseRemoveDir = function(path, fusecb) {
    console.error("_fuseRemoveDir("+path+") - Not Implemented");
    fusecb(-1); //  Always access denied
  };

  FuseJPAK.prototype._fuseSetXAttr = function(path, name, value, size, a, b, c, fusecb) {
    console.log("Setxattr called:", path, name, value, size, a, b, c);
    //fusecb(0);
  };

  FuseJPAK.prototype._fuseStatFS = function(fusecb) {
    // Todo JPAK Size
    fusecb(0, {
        bsize: 1000000,
        frsize: 1000000,
        blocks: 1000000,
        bfree: 1000000,
        bavail: 1000000,
        files: 1000000,
        ffree: 1000000,
        favail: 1000000,
        fsid: 1000000,
        flag: 1000000,
        namemax: 1000000
    });
  };

  FuseJPAK.prototype._fuseDestroy = function(fusecb) {
    fusecb();
  };

  module.exports.FuseJPAK = FuseJPAK;

})();