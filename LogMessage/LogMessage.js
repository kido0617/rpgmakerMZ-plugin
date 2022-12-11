/*---------------------------------------------------------------------------*
 * 2022/12/11 kido
 * https://kido0617.github.io/
 *---------------------------------------------------------------------------*/

/*:
 * @plugindesc ログメッセージプラグイン
 * @target MZ
 * @base PluginCommonBase
 * @orderAfter PluginCommonBase
 * @author kido0617
 * @help
 * 
 * 機能は各プラグインコマンドを参照。
 * 最初に初期化コマンドから表示位置とサイズを指定し実行します。  
 * その後はメッセージ追加もコマンドからテキストを追加します。 
 * 初期化したマップでのみ有効。マップ遷移したら自動的に消えます。
 * 
 * @command init
 * @text 初期化
 * @desc 座標とサイズを指定
 *
 * @arg x
 * @text x
 * @type number
 * 
 * @arg y
 * @text y
 * @type number
 * 
 * @arg width
 * @text width
 * @type number
 * 
 * @arg height
 * @text height
 * @type number
 * 
 * @command add
 * @text メッセージ追加
 * @desc 
 * 
 * @arg text
 * @text テキスト
 * @desc 制御文字も使えます
 * 
 * @command hide
 * @text 非表示
 * @desc 一時的に非表示にします
 * 
 * @command show
 * @text 表示
 * @desc 非表示したものを表示します
 * 
 * @command clear
 * @text ログを消去
 * @desc 表示しているログを消します
 * 
 * @command remove
 * @text ウィンドウ除去
 * @desc 完全に消えます。再度初期化してください
 * 
 * 
 * @param lineHeight
 * @text 1行の高さ
 * @desc 基本的に フォントサイズ+α です。
 * @type number
 * @default 36
 * 
 * @param fontSize
 * @text フォントサイズ
 * @desc フォントサイズです
 * @type number
 * @default 28
 * 
 * @param iconSize
 * @text アイコンサイズ
 * @desc アイコンサイズです
 * @type number
 * @default 32
 * 
 * @param scrollSpeed
 * @text スクロールスピード
 * @desc コメントが上にスクロールするスピード[pixel/frame]
 * @type number
 * @default 4
 * 
 * 
 * 
 */

(function () {

  const script = document.currentScript;
  const param = PluginManagerEx.createParameter(script);

  function getLogMessageWindow() {
    let lm = SceneManager._scene._logMessageWindow;
    return lm;
  }

  PluginManagerEx.registerCommand(script, 'init', args => {
    if (SceneManager._scene._logMessageWindow) {
      console.error('すでにinitされてあります');
      return;
    }
    let lm = new LogMessageContainer(args.x, args.y, args.width, args.height);
    var spriteSetMap = null;
    for (var i = 0; SceneManager._scene.children.length; i++) {
      if (SceneManager._scene.children[i] instanceof Spriteset_Map) {
        spriteSetMap = SceneManager._scene.children[i];
        break;
      }
    }
    if (spriteSetMap) {
      //ピクチャの上、フェードの下に位置したい
      for (var i = 0; i < spriteSetMap.children.length; i++) {
        if (spriteSetMap.children[i] instanceof Sprite_Timer) {
          spriteSetMap.addChildAt(lm, i);
          break;
        }
      }
    } else {
      SceneManager._scene.addChild(lm);
    }
    SceneManager._scene._logMessageWindow = lm;
  });

  PluginManagerEx.registerCommand(script, 'add', args => {
    let lm = getLogMessageWindow();
    if (lm) lm.show(args.text);
  });

  PluginManagerEx.registerCommand(script, 'hide', args => {
    let lm = getLogMessageWindow();
    if (lm) lm.visible = false;
  });

  PluginManagerEx.registerCommand(script, 'show', args => {
    let lm = getLogMessageWindow();
    if (lm) lm.visible = true;
  });

  PluginManagerEx.registerCommand(script, 'clear', args => {
    let lm = getLogMessageWindow();
    if (lm) lm.clear();
  });

  PluginManagerEx.registerCommand(script, 'remove', args => {
    let lm = getLogMessageWindow();
    if (!lm) return;
    lm.parent.removeChild(lm);
    SceneManager._scene._logMessageWindow = null;
  });


  function LogMessageContainer(x, y, width, height) {
    PIXI.Container.call(this);
    this.x = x;
    this.y = y;
    this._width = width;
    this._height = height;
    this.yPos = 0;
    this.mask = new PIXI.Graphics();
    this.mask.beginFill();
    this.mask.drawRect(x, y, width, height);
    this.mask.endFill();
    this.hiddenWindow = new Window_Hidden(width);
  }

  LogMessageContainer.prototype = Object.create(PIXI.Container.prototype);
  LogMessageContainer.prototype.constructor = LogMessageContainer;

  LogMessageContainer.prototype.update = function () {
    let moveY = 0;
    //最後に追加したコメントが枠外だったらスクロール開始するので移動量算出
    if (this.children.length > 0) {
      let last = this.children[this.children.length - 1];
      let bottom = last.y + last.height;
      let diff = bottom - this._height;
      if (diff > 0) moveY = diff > param.scrollSpeed ? param.scrollSpeed : diff;
    }

    for (let i = 0; i < this.children.length; i++) {
      this.children[i].update();
      this.children[i].y -= moveY;
    }
    this.yPos -= moveY;

    //画面外にスクロールしたコメントを消す
    if (this.children[0] && this.children[0].y + this.children[0].height <= 0) {
      this.removeChildAt(0);
    }
  };


  LogMessageContainer.prototype.show = function (text) {
    let textSprite = new Sprite();
    textSprite.y = this.yPos;
    this.addChild(textSprite);
    this.hiddenWindow.drawTextEx(text, 0, param.lineHeight / 2 - param.fontSize / 2, this._width);
    textSprite.bitmap = this.hiddenWindow.contents;
    this.hiddenWindow.contents = null;
    this.hiddenWindow.createContents();
    this.yPos += param.lineHeight;
  };

  LogMessageContainer.prototype.clear = function () {
    this.removeChildren();
    this.yPos = 0;
  };

  // 文字を描画したbitmapを使いたいためだけのwindow。
  function Window_Hidden() {
    this.initialize.apply(this, arguments);
  }
  Window_Hidden.prototype = Object.create(Window_Base.prototype);
  Window_Hidden.prototype.constructor = Window_Hidden;

  Window_Hidden.prototype.initialize = function (width) {
    Window.prototype.initialize.call(this);
    this.tmpWidth = width;
    this.createContents();
    this.padding = 0;
  };

  Window_Hidden.prototype._createAllParts = function () {
    this._createContentsSprite();
  };

  Window_Hidden.prototype._createContentsSprite = function () {
    this._contentsSprite = new Sprite();
  };

  Window_Hidden.prototype.createContents = function () {
    this.destroyContents();
    this.contents = new Bitmap(this.tmpWidth, this.lineHeight());
    this.resetFontSettings();
  };

  Window_Hidden.prototype.destroyContents = function () {
    if (this.contents) {
      this.contents.destroy();
    }
  };

  Window_Hidden.prototype.processDrawIcon = function (iconIndex, textState) {
    this.drawIcon(iconIndex, textState.x + 2, this.lineHeight() / 2 - param.iconSize / 2);
    textState.x += param.iconSize + 4;
  };

  Window_Hidden.prototype.drawIcon = function (iconIndex, x, y) {
    const bitmap = ImageManager.loadSystem('IconSet');
    const pw = ImageManager.iconWidth;
    const ph = ImageManager.iconHeight;
    const sx = iconIndex % 16 * pw;
    const sy = Math.floor(iconIndex / 16) * ph;
    const size = param.iconSize;
    this.contents.blt(bitmap, sx, sy, pw, ph, x, y, size, size);
  };

  Window_Hidden.prototype.resetFontSettings = function () {
    this.contents.fontFace = $gameSystem.mainFontFace();
    this.contents.fontSize = param.fontSize;
    this.resetTextColor();
  };

  Window_Hidden.prototype.lineHeight = function () {
    return param.lineHeight;
  };

  Window_Hidden.prototype.fittingHeight = function (numLines) {
    return numLines * this.itemHeight();
  };

  Window_Hidden.prototype.itemPadding = function () {
    return 0;
  };

  Window_Hidden.prototype.calcTextHeight = function (textState) {
    const lastFontSize = this.contents.fontSize;
    const lines = textState.text.slice(textState.index).split('\n');
    const textHeight = this.maxFontSizeInLine(lines[0]);
    this.contents.fontSize = lastFontSize;
    return textHeight;
  };

  Window_Hidden.prototype._refreshAllParts = function () { };
  Window_Hidden.prototype._refreshBack = function () { };
  Window_Hidden.prototype._refreshFrame = function () { };
  Window_Hidden.prototype._refreshCursor = function () { };
  Window_Hidden.prototype._refreshArrows = function () { };
  Window_Hidden.prototype._refreshPauseSign = function () { };
  Window_Hidden.prototype.updateTransform = function () { };

})();
