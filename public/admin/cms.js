/**
 * Decap CMS extensions for Ellen Carty admin:
 *  - cover-frame widget: drag a photo onto a framed canvas (video-editor style)
 *  - live site-styled previews for Writing + Watch entries
 */
(function () {
  var h = window.h;
  var createClass = window.createClass;
  var CMS = window.CMS;

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return "cover-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function parseAspect(raw, fallback) {
    if (!raw) return fallback;
    var cleaned = String(raw).replace(/\s+/g, "");
    var parts = cleaned.split(/[/:]/);
    if (parts.length === 2) {
      var w = parseFloat(parts[0]);
      var ht = parseFloat(parts[1]);
      if (w > 0 && ht > 0) return w / ht;
    }
    var n = parseFloat(cleaned);
    return n > 0 ? n : fallback;
  }

  function resolveAspect(field, entry) {
    var fromField = field && field.get("aspect_from");
    if (fromField && entry) {
      var orientation = entry.getIn(["data", fromField]) || "portrait";
      if (orientation === "landscape") {
        return parseAspect(field.get("aspect_landscape"), 16 / 9);
      }
      return parseAspect(field.get("aspect_portrait"), 9 / 16);
    }
    return parseAspect(field && field.get("aspect"), 16 / 10);
  }

  function assetUrl(getAsset, value, field) {
    if (!value) return "";
    try {
      var asset = getAsset ? getAsset(value, field) : null;
      if (asset && typeof asset.toString === "function") {
        return asset.toString();
      }
    } catch (err) {
      /* draft assets can throw before they settle */
    }
    return String(value);
  }

  function basename(path) {
    return String(path || "")
      .split(/[\\/]/)
      .pop();
  }

  function sanitizeFileName(name) {
    var base = basename(name || "image.jpg");
    var parts = base.split(".");
    var ext = parts.length > 1 ? parts.pop() : "jpg";
    var stem = parts.join(".") || "image";
    stem = stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return (stem || "image") + "." + ext.toLowerCase();
  }

  function publicPathForMedia(field, mediaFile, file) {
    var publicFolder = (field && field.get("public_folder")) || "/uploads";
    publicFolder = String(publicFolder).replace(/\/$/, "");
    var name =
      (mediaFile && (mediaFile.name || basename(mediaFile.path))) ||
      (file && sanitizeFileName(file.name)) ||
      "image.jpg";
    return publicFolder + "/" + name;
  }

  function extractMediaFile(result) {
    if (!result) return null;
    if (result.path || result.url || result.name) return result;
    if (result.payload) {
      if (result.payload.path || result.payload.url || result.payload.name) {
        return result.payload;
      }
      if (result.payload.file) return result.payload.file;
    }
    return null;
  }

  function formatDateLabel(date) {
    if (!date) return "";
    var parsed = new Date(date);
    if (isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  /* ------------------------------------------------------------------ */
  /*  cover-frame control — drag photo onto the framed canvas            */
  /* ------------------------------------------------------------------ */
  var CoverFrameControl = createClass({
    getInitialState: function () {
      return {
        controlID: uuid(),
        dragging: false,
        uploading: false,
        error: "",
      };
    },

    componentDidMount: function () {
      this._mounted = true;
    },

    componentWillUnmount: function () {
      this._mounted = false;
      if (this.props.onRemoveMediaControl) {
        this.props.onRemoveMediaControl(this.state.controlID);
      }
    },

    shouldComponentUpdate: function (nextProps, nextState) {
      if (
        this.props.value !== nextProps.value ||
        this.props.getAsset !== nextProps.getAsset ||
        this.props.classNameWrapper !== nextProps.classNameWrapper ||
        this.state.dragging !== nextState.dragging ||
        this.state.uploading !== nextState.uploading ||
        this.state.error !== nextState.error
      ) {
        return true;
      }
      var nextPaths = nextProps.mediaPaths;
      var mediaPath = nextPaths && nextPaths.get && nextPaths.get(this.state.controlID);
      if (mediaPath && nextProps.value !== mediaPath) {
        return true;
      }
      var nextOrientation =
        nextProps.entry && nextProps.entry.getIn
          ? nextProps.entry.getIn(["data", "orientation"])
          : null;
      var curOrientation =
        this.props.entry && this.props.entry.getIn
          ? this.props.entry.getIn(["data", "orientation"])
          : null;
      if (nextOrientation !== curOrientation) return true;
      var focusField =
        this.props.field && this.props.field.get("focus_field");
      if (focusField) {
        var nextFocus =
          nextProps.entry && nextProps.entry.getIn
            ? nextProps.entry.getIn(["data", focusField])
            : null;
        var curFocus =
          this.props.entry && this.props.entry.getIn
            ? this.props.entry.getIn(["data", focusField])
            : null;
        if (nextFocus !== curFocus) return true;
      }
      return false;
    },

    componentDidUpdate: function () {
      var mediaPaths = this.props.mediaPaths;
      if (!mediaPaths || !mediaPaths.get) return;
      var mediaPath = mediaPaths.get(this.state.controlID);
      if (mediaPath && mediaPath !== this.props.value) {
        this.props.onChange(mediaPath);
      } else if (mediaPath && mediaPath === this.props.value) {
        if (this.props.onRemoveInsertedMedia) {
          this.props.onRemoveInsertedMedia(this.state.controlID);
        }
      }
    },

    openLibrary: function (event) {
      if (event) event.preventDefault();
      if (!this.props.onOpenMediaLibrary) return;
      this.props.onOpenMediaLibrary({
        controlID: this.state.controlID,
        forImage: true,
        privateUpload: this.props.field.get("private"),
        value: this.props.value || "",
        allowMultiple: false,
        config: this.props.field.getIn(["media_library", "config"]),
        field: this.props.field,
      });
    },

    promptUrl: function (event) {
      if (event) event.preventDefault();
      var url = window.prompt("Paste an image URL");
      if (url) this.props.onChange(url.trim());
    },

    clearValue: function (event) {
      if (event) event.preventDefault();
      if (this.props.onClearMediaControl) {
        this.props.onClearMediaControl(this.state.controlID);
      }
      this.props.onChange("");
      if (this._mounted) this.setState({ error: "" });
    },

    onDragOver: function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!this.state.dragging) this.setState({ dragging: true });
    },

    onDragLeave: function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (this.state.dragging) this.setState({ dragging: false });
    },

    onDrop: function (event) {
      event.preventDefault();
      event.stopPropagation();
      this.setState({ dragging: false });
      var files = event.dataTransfer && event.dataTransfer.files;
      if (files && files.length) {
        this.ingestFile(files[0]);
      }
    },

    onFileInput: function (event) {
      var files = event.target.files;
      if (files && files.length) {
        this.ingestFile(files[0]);
      }
      event.target.value = "";
    },

    ingestFile: function (file) {
      var self = this;
      if (!file) return;
      if (!/^image\//.test(file.type) && !/\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name)) {
        this.setState({ error: "Please drop an image file (JPG, PNG, HEIC, WebP)." });
        return;
      }
      var warnMb = 1.5;
      var sizeMb = file.size / (1024 * 1024);
      var sizeWarning =
        sizeMb > warnMb
          ? "This image is " +
            sizeMb.toFixed(1) +
            "MB — large for the web. Prefer under ~1.5MB (export/compress before upload)."
          : "";
      if (!this.props.onPersistMedia) {
        this.setState({ error: "Upload isn’t available — use Choose from library instead." });
        this.openLibrary();
        return;
      }

      this.setState({ uploading: true, error: sizeWarning });
      Promise.resolve(this.props.onPersistMedia(file, { field: this.props.field }))
        .then(function (result) {
          var mediaFile = extractMediaFile(result);
          var nextValue = publicPathForMedia(self.props.field, mediaFile, file);
          self.props.onChange(nextValue);
          if (self._mounted) {
            self.setState({
              uploading: false,
              error: sizeWarning,
            });
          }
        })
        .catch(function (err) {
          console.error(err);
          if (self._mounted) {
            self.setState({
              uploading: false,
              error: "Couldn’t upload that photo. Try Choose from library.",
            });
          }
        });
    },

    render: function () {
      var field = this.props.field;
      var value = this.props.value;
      var getAsset = this.props.getAsset;
      var entry = this.props.entry;
      var aspect = resolveAspect(field, entry);
      var src = assetUrl(getAsset, value, field);
      var chooseUrl = field.get("choose_url", true) !== false;
      var frameLabel = field.get("frame_label") || "Cover frame";
      var emptyHint =
        field.get("empty_hint") || "Drag a photo onto this frame, or click to choose";

      var frameClass = "cover-frame";
      if (this.state.dragging) frameClass += " cover-frame--dragging";
      if (this.state.uploading) frameClass += " cover-frame--uploading";
      if (src) frameClass += " cover-frame--filled";

      return h(
        "div",
        { className: "cover-frame-widget", id: this.props.forID },
        h(
          "div",
          {
            className: frameClass,
            style: { aspectRatio: String(aspect) },
            onDragOver: this.onDragOver,
            onDragEnter: this.onDragOver,
            onDragLeave: this.onDragLeave,
            onDrop: this.onDrop,
            onClick: src ? undefined : this.openLibrary,
            role: src ? undefined : "button",
            tabIndex: src ? undefined : 0,
            onKeyDown: src
              ? undefined
              : function (event) {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    this.openLibrary(event);
                  }
                }.bind(this),
            "aria-label": src ? frameLabel : emptyHint,
          },
          src
            ? h("img", {
                className: "cover-frame__image",
                src: src,
                alt: "",
                style: {
                  objectPosition: (function () {
                    var focusField = field.get("focus_field");
                    var focus =
                      (focusField &&
                        entry &&
                        entry.getIn(["data", focusField])) ||
                      "center";
                    if (focus === "top") return "center top";
                    if (focus === "bottom") return "center bottom";
                    if (focus === "left") return "left center";
                    if (focus === "right") return "right center";
                    return "center";
                  })(),
                },
              })
            : h(
                "div",
                { className: "cover-frame__empty" },
                h("span", { className: "cover-frame__glyph" }, "⧉"),
                h("span", { className: "cover-frame__empty-title" }, emptyHint),
                h(
                  "span",
                  { className: "cover-frame__empty-sub" },
                  "Matches how it will crop on the site"
                )
              ),
          this.state.uploading
            ? h("div", { className: "cover-frame__overlay" }, "Uploading…")
            : null,
          this.state.dragging
            ? h("div", { className: "cover-frame__overlay" }, "Drop to place")
            : null
        ),
        h(
          "div",
          { className: "cover-frame__actions" },
          h(
            "button",
            {
              type: "button",
              className: "cover-frame__btn",
              onClick: this.openLibrary,
            },
            src ? "Replace from library" : "Choose from library"
          ),
          h(
            "label",
            { className: "cover-frame__btn cover-frame__btn--file" },
            "Upload from device",
            h("input", {
              type: "file",
              accept: "image/*,.heic,.heif",
              onChange: this.onFileInput,
              hidden: true,
            })
          ),
          chooseUrl
            ? h(
                "button",
                {
                  type: "button",
                  className: "cover-frame__btn cover-frame__btn--ghost",
                  onClick: this.promptUrl,
                },
                src ? "Replace with URL" : "Paste URL"
              )
            : null,
          src
            ? h(
                "button",
                {
                  type: "button",
                  className: "cover-frame__btn cover-frame__btn--danger",
                  onClick: this.clearValue,
                },
                "Remove"
              )
            : null
        ),
        this.state.error
          ? h("p", { className: "cover-frame__error" }, this.state.error)
          : null,
        h(
          "p",
          { className: "cover-frame__hint" },
          "Tip: drag a photo straight onto the frame — like dropping media on a timeline."
        )
      );
    },
  });

  var CoverFramePreview = createClass({
    render: function () {
      var value = this.props.value;
      var getAsset = this.props.getAsset;
      var field = this.props.field;
      var entry = this.props.entry;
      var src = assetUrl(getAsset, value, field);
      if (!src) {
        return h("div", { className: "cover-frame-preview cover-frame-preview--empty" }, "No cover yet");
      }
      var aspect = resolveAspect(field, entry);
      return h(
        "div",
        {
          className: "cover-frame-preview",
          style: { aspectRatio: String(aspect) },
        },
        h("img", { src: src, alt: "" })
      );
    },
  });

  CMS.registerWidget("cover-frame", CoverFrameControl, CoverFramePreview);

  /* ------------------------------------------------------------------ */
  /*  editorial-note — publish tips / slug / status checklist            */
  /* ------------------------------------------------------------------ */
  var EditorialNoteControl = createClass({
    render: function () {
      var field = this.props.field;
      var notes = field.get("notes");
      var items = [];
      if (notes && notes.toJS) {
        items = notes.toJS();
      } else if (Array.isArray(notes)) {
        items = notes;
      }
      var entry = this.props.entry;
      var draft = entry && entry.getIn(["data", "draft"]);
      var publishAfter = entry && entry.getIn(["data", "publishAfter"]);
      var title = (entry && entry.getIn(["data", "title"])) || "";
      var slugGuess = String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      var checklist = [];
      if (draft === true) checklist.push("Draft is ON — this will not appear on the live site.");
      if (publishAfter) {
        checklist.push("Scheduled for " + String(publishAfter).slice(0, 10) + " (UTC) — hidden until then.");
      }
      if (!draft && !publishAfter) checklist.push("Ready to go live on the next deploy after Publish.");
      if (slugGuess) checklist.push("Likely URL slug: /posts/" + slugGuess + " (or /watch for videos). Renaming later breaks old links.");

      return h(
        "div",
        { className: "editorial-note", id: this.props.forID },
        h("p", { className: "editorial-note__title" }, "Before you publish"),
        h(
          "ul",
          { className: "editorial-note__list" },
          items.map(function (note, index) {
            return h("li", { key: "n-" + index }, note);
          })
        ),
        checklist.length
          ? h(
              "ul",
              { className: "editorial-note__status" },
              checklist.map(function (item, index) {
                return h("li", { key: "c-" + index }, item);
              })
            )
          : null
      );
    },
  });

  CMS.registerWidget("editorial-note", EditorialNoteControl, createClass({
    render: function () {
      return h("span", null);
    },
  }));

  /* ------------------------------------------------------------------ */
  /*  video-file — file picker with size guardrail                       */
  /* ------------------------------------------------------------------ */
  var MAX_VIDEO_MB_DEFAULT = 95;

  var VideoFileControl = createClass({
    getInitialState: function () {
      return { controlID: uuid(), error: "", uploading: false };
    },

    componentDidMount: function () {
      this._mounted = true;
    },

    componentWillUnmount: function () {
      this._mounted = false;
      if (this.props.onRemoveMediaControl) {
        this.props.onRemoveMediaControl(this.state.controlID);
      }
    },

    componentDidUpdate: function () {
      var mediaPaths = this.props.mediaPaths;
      if (!mediaPaths || !mediaPaths.get) return;
      var mediaPath = mediaPaths.get(this.state.controlID);
      if (mediaPath && mediaPath !== this.props.value) {
        this.props.onChange(mediaPath);
      } else if (mediaPath && mediaPath === this.props.value) {
        if (this.props.onRemoveInsertedMedia) {
          this.props.onRemoveInsertedMedia(this.state.controlID);
        }
      }
    },

    maxBytes: function () {
      var maxMb = Number(this.props.field.get("max_mb")) || MAX_VIDEO_MB_DEFAULT;
      return maxMb * 1024 * 1024;
    },

    openLibrary: function (event) {
      if (event) event.preventDefault();
      if (!this.props.onOpenMediaLibrary) return;
      this.props.onOpenMediaLibrary({
        controlID: this.state.controlID,
        forImage: false,
        privateUpload: this.props.field.get("private"),
        value: this.props.value || "",
        allowMultiple: false,
        config: this.props.field.getIn(["media_library", "config"]),
        field: this.props.field,
      });
    },

    clearValue: function (event) {
      if (event) event.preventDefault();
      if (this.props.onClearMediaControl) {
        this.props.onClearMediaControl(this.state.controlID);
      }
      this.props.onChange("");
      if (this._mounted) this.setState({ error: "" });
    },

    onFileInput: function (event) {
      var files = event.target.files;
      if (files && files.length) this.ingestFile(files[0]);
      event.target.value = "";
    },

    ingestFile: function (file) {
      var self = this;
      if (!file) return;
      var max = this.maxBytes();
      var maxMb = Math.round(max / (1024 * 1024));
      if (file.size > max) {
        this.setState({
          error:
            "That file is " +
            (file.size / (1024 * 1024)).toFixed(1) +
            "MB. Keep videos under ~" +
            maxMb +
            "MB (compress on your phone) so GitHub stays reliable.",
        });
        return;
      }
      if (!this.props.onPersistMedia) {
        this.setState({ error: "Upload isn’t available — use Choose from library." });
        return;
      }
      this.setState({ uploading: true, error: "" });
      Promise.resolve(this.props.onPersistMedia(file, { field: this.props.field }))
        .then(function (result) {
          var mediaFile = extractMediaFile(result);
          var nextValue = publicPathForMedia(self.props.field, mediaFile, file);
          self.props.onChange(nextValue);
          if (self._mounted) self.setState({ uploading: false });
        })
        .catch(function (err) {
          console.error(err);
          if (self._mounted) {
            self.setState({
              uploading: false,
              error: "Couldn’t upload that video. Try Choose from library.",
            });
          }
        });
    },

    render: function () {
      var value = this.props.value || "";
      var maxMb = Number(this.props.field.get("max_mb")) || MAX_VIDEO_MB_DEFAULT;
      return h(
        "div",
        { className: "video-file-widget", id: this.props.forID },
        value
          ? h("p", { className: "video-file-widget__value" }, value)
          : h("p", { className: "video-file-widget__empty" }, "No video uploaded yet"),
        h(
          "div",
          { className: "video-file-widget__actions" },
          h(
            "button",
            { type: "button", className: "cover-frame__btn", onClick: this.openLibrary },
            value ? "Replace from library" : "Choose from library"
          ),
          h(
            "label",
            { className: "cover-frame__btn cover-frame__btn--file" },
            this.state.uploading ? "Uploading…" : "Upload from device",
            h("input", {
              type: "file",
              accept: "video/*,.mov,.mp4,.m4v",
              onChange: this.onFileInput,
              hidden: true,
              disabled: this.state.uploading,
            })
          ),
          value
            ? h(
                "button",
                {
                  type: "button",
                  className: "cover-frame__btn cover-frame__btn--danger",
                  onClick: this.clearValue,
                },
                "Remove"
              )
            : null
        ),
        this.state.error
          ? h("p", { className: "cover-frame__error" }, this.state.error)
          : null,
        h(
          "p",
          { className: "cover-frame__hint" },
          "Max ~" +
            maxMb +
            "MB (.mov or .mp4). After Publish, remux + captions usually take a few minutes — refresh Watch later."
        )
      );
    },
  });

  CMS.registerWidget("video-file", VideoFileControl, createClass({
    render: function () {
      return h("span", { className: "video-file-preview" }, this.props.value || "No video");
    },
  }));

  /* ------------------------------------------------------------------ */
  /*  Writing preview                                                    */
  /* ------------------------------------------------------------------ */
  var PostPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;

      var title = entry.getIn(["data", "title"]) || "Untitled post";
      var topic = entry.getIn(["data", "topic"]) || "Civic";
      var date = entry.getIn(["data", "date"]);
      var image = entry.getIn(["data", "image"]);
      var imageAlt = entry.getIn(["data", "imageAlt"]) || title;
      var dateLabel = formatDateLabel(date);
      var coverSrc = assetUrl(getAsset, image);

      return h(
        "div",
        { className: "site-preview" },
        h(
          "div",
          { className: "site-preview__badge" },
          "Preview · Writing post"
        ),
        h(
          "header",
          { className: "site-preview__header" },
          h("span", { className: "site-preview__brand" }, "Ellen Carty"),
          h("span", { className: "site-preview__nav" }, "ALL WRITING")
        ),
        h(
          "article",
          { className: "site-preview__article" },
          h("p", { className: "site-preview__topic" }, topic),
          h("h1", { className: "site-preview__title" }, title),
          dateLabel ? h("time", { className: "site-preview__date" }, dateLabel) : null,
          entry.getIn(["data", "draft"])
            ? h("p", { className: "site-preview__draft" }, "Draft — not on the live site")
            : null,
          coverSrc
            ? h(
                "div",
                { className: "site-preview__media" },
                h("img", {
                  src: coverSrc,
                  alt: imageAlt,
                  style: {
                    objectPosition: (function () {
                      var focus = entry.getIn(["data", "imageFocus"]) || "center";
                      if (focus === "top") return "center top";
                      if (focus === "bottom") return "center bottom";
                      if (focus === "left") return "left center";
                      if (focus === "right") return "right center";
                      return "center";
                    })(),
                  },
                })
              )
            : h(
                "div",
                { className: "site-preview__media site-preview__media--empty" },
                "Cover photo will appear here"
              ),
          h("div", { className: "site-preview__body" }, this.props.widgetFor("body")),
          h("div", { className: "site-preview__footer" }, "Reach out about this piece →")
        )
      );
    },
  });

  CMS.registerPreviewTemplate("posts", PostPreview);

  /* ------------------------------------------------------------------ */
  /*  Watch / video preview                                              */
  /* ------------------------------------------------------------------ */
  var VideoPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;

      var title = entry.getIn(["data", "title"]) || "Untitled video";
      var eyebrow = entry.getIn(["data", "eyebrow"]) || "Watch";
      var description = entry.getIn(["data", "description"]) || "";
      var durationLabel = entry.getIn(["data", "durationLabel"]) || "";
      var orientation = entry.getIn(["data", "orientation"]) || "portrait";
      var poster = entry.getIn(["data", "poster"]);
      var video = entry.getIn(["data", "video"]);
      var captions = entry.getIn(["data", "captions"]);
      var instagramUrl = entry.getIn(["data", "instagramUrl"]);
      var transcript = entry.getIn(["data", "transcript"]);
      var hasTranscript =
        transcript &&
        ((transcript.size && transcript.size > 0) ||
          (Array.isArray(transcript) && transcript.length > 0));

      var posterSrc = assetUrl(getAsset, poster);
      var videoSrc = assetUrl(getAsset, video);
      var isPortrait = orientation !== "landscape";

      return h(
        "div",
        { className: "site-preview site-preview--watch" },
        h(
          "div",
          { className: "site-preview__badge" },
          "Preview · Watch video"
        ),
        entry.getIn(["data", "draft"])
          ? h("p", { className: "site-preview__draft" }, "Draft — not on the live site")
          : null,
        h(
          "p",
          { className: "watch-preview__pipeline" },
          "After Publish: remux + auto-captions usually take a few minutes. Refresh Watch later."
        ),
        h(
          "header",
          { className: "watch-preview__header" },
          h("p", { className: "watch-preview__eyebrow" }, eyebrow),
          h("h1", { className: "watch-preview__title" }, title),
          description
            ? h("p", { className: "watch-preview__description" }, description)
            : null,
          h(
            "div",
            { className: "watch-preview__meta" },
            durationLabel ? h("span", null, durationLabel) : h("span", null, "Duration auto"),
            captions ? h("span", null, "· Captions available") : null,
            hasTranscript ? h("span", null, "· Full transcript") : null,
            instagramUrl ? h("span", null, "· @elleninpolitics") : null
          )
        ),
        h(
          "div",
          {
            className:
              "watch-preview__stage" +
              (isPortrait ? " watch-preview__stage--portrait" : " watch-preview__stage--landscape"),
          },
          h(
            "div",
            {
              className:
                "watch-preview__frame" +
                (isPortrait
                  ? " watch-preview__frame--portrait"
                  : " watch-preview__frame--landscape"),
            },
            videoSrc
              ? h(
                  "video",
                  {
                    className: "watch-preview__video",
                    src: videoSrc,
                    poster: posterSrc || undefined,
                    controls: true,
                    playsInline: true,
                    preload: "metadata",
                  }
                )
              : posterSrc
                ? h("img", {
                    className: "watch-preview__poster",
                    src: posterSrc,
                    alt: "",
                  })
                : h(
                    "div",
                    { className: "watch-preview__placeholder" },
                    "Drop a poster on the frame, or upload a video — preview appears here"
                  ),
            h("div", { className: "watch-preview__vignette" }),
            !videoSrc
              ? h(
                  "div",
                  { className: "watch-preview__play" },
                  h("span", { className: "watch-preview__play-btn" })
                )
              : null,
            durationLabel
              ? h("span", { className: "watch-preview__duration" }, durationLabel)
              : null
          )
        ),
        h(
          "p",
          { className: "watch-preview__note" },
          isPortrait
            ? "Portrait reel (9:16) — as it appears on Watch"
            : "Landscape (16:9) — as it appears on Watch"
        )
      );
    },
  });

  CMS.registerPreviewTemplate("videos", VideoPreview);

  CMS.registerPreviewStyle(
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Outfit:wght@300;400;500;600&display=swap"
  );
  CMS.registerPreviewStyle("/admin/preview.css");
})();
