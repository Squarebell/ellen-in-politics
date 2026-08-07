/**
 * Workflow widgets for Decap CMS — checklist, slug, suggestions, focal click,
 * featured exclusivity, captions/pipeline status, transcript editor,
 * related posts, schedule helper, media health.
 */
(function () {
  var h = window.h;
  var createClass = window.createClass;
  var CMS = window.CMS;

  var indexCache = null;
  var indexPromise = null;

  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    if (indexPromise) return indexPromise;
    indexPromise = fetch("/admin/content-index.json?ts=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error("index " + res.status);
        return res.json();
      })
      .then(function (data) {
        indexCache = data;
        return data;
      })
      .catch(function () {
        indexCache = { topics: [], series: [], posts: [], videos: [] };
        return indexCache;
      });
    return indexPromise;
  }

  function slugify(title) {
    return String(title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function entrySlug(entry) {
    if (!entry) return "";
    var fromMeta = entry.getIn && (entry.getIn(["meta", "path"]) || entry.get("path"));
    if (fromMeta) {
      var base = String(fromMeta).split(/[\\/]/).pop() || "";
      return base.replace(/\.md$/i, "");
    }
    var slug = entry.get && entry.get("slug");
    return slug ? String(slug) : slugify(entry.getIn(["data", "title"]));
  }

  function listFromImmutable(value) {
    if (!value) return [];
    if (value.toJS) return value.toJS();
    if (Array.isArray(value)) return value;
    return [];
  }

  function focusToObjectPosition(focus) {
    if (focus === "top") return "center top";
    if (focus === "bottom") return "center bottom";
    if (focus === "left") return "left center";
    if (focus === "right") return "right center";
    return "center";
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var target = String(dateStr).slice(0, 10);
    var today = new Date();
    var todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    var parts = target.split("-").map(Number);
    if (parts.length !== 3) return null;
    var thenUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
    return Math.round((thenUtc - todayUtc) / 86400000);
  }

  function probePath(path) {
    if (!path) return Promise.resolve({ path: path, ok: null });
    if (/^https?:\/\//i.test(path)) {
      return fetch(path, { method: "HEAD", mode: "no-cors" })
        .then(function () {
          return { path: path, ok: true, opaque: true };
        })
        .catch(function () {
          return { path: path, ok: false };
        });
    }
    var url = path.startsWith("/") ? path : "/" + path;
    return fetch(url, { method: "GET", cache: "no-store" })
      .then(function (res) {
        return { path: path, ok: res.ok };
      })
      .catch(function () {
        return { path: path, ok: false };
      });
  }

  var EmptyPreview = createClass({
    render: function () {
      return h("span", null);
    },
  });

  /* ------------------------------------------------------------------ */
  /*  workflow-panel — live checklist + slug + schedule + pipeline        */
  /* ------------------------------------------------------------------ */
  var WorkflowPanelControl = createClass({
    getInitialState: function () {
      return { index: null };
    },
    componentDidMount: function () {
      var self = this;
      this._mounted = true;
      loadIndex().then(function (index) {
        if (self._mounted) self.setState({ index: index });
      });
    },
    componentWillUnmount: function () {
      this._mounted = false;
    },
    render: function () {
      var field = this.props.field;
      var kind = field.get("kind") || "posts";
      var notes = listFromImmutable(field.get("notes"));
      var entry = this.props.entry;
      var data = function (key) {
        return entry && entry.getIn(["data", key]);
      };

      var draft = data("draft") === true;
      var publishAfter = data("publishAfter");
      var title = data("title") || "";
      var slug = entrySlug(entry) || slugify(title);
      var urlPath = kind === "videos" ? "/watch" : "/posts/" + (slug || "your-slug");
      var until = daysUntil(publishAfter);

      var checks = [];
      if (kind === "posts") {
        checks = [
          { ok: !!title, label: "Title" },
          { ok: !!(data("excerpt") && String(data("excerpt")).trim()), label: "Excerpt" },
          { ok: !!data("date"), label: "Publish date" },
          { ok: !!(data("topic") && String(data("topic")).trim()), label: "Topic" },
          { ok: !!data("image"), label: "Cover photo" },
          {
            ok: !data("image") || !!(data("imageAlt") && String(data("imageAlt")).trim()),
            label: "Cover alt text",
          },
          {
            ok: !!(this.props.widgetFor && this.props.value) || true,
            label: "Body (write below)",
            soft: true,
          },
        ];
        // Body isn't available as sibling easily; mark soft tip instead
        checks[checks.length - 1] = {
          ok: true,
          label: "Body — write in the field below before publishing",
          soft: true,
        };
      } else {
        checks = [
          { ok: !!title, label: "Title" },
          {
            ok: !!(data("description") && String(data("description")).trim()),
            label: "Description",
          },
          { ok: !!data("date"), label: "Publish date" },
          { ok: !!data("orientation"), label: "Orientation" },
          { ok: !!data("video"), label: "Video file" },
        ];
      }

      var readyCount = checks.filter(function (c) {
        return c.ok;
      }).length;

      var statusLines = [];
      if (draft) statusLines.push({ tone: "warn", text: "Draft ON — hidden from the live site." });
      if (publishAfter) {
        var when = String(publishAfter).slice(0, 10);
        if (until == null) {
          statusLines.push({ tone: "warn", text: "Scheduled for " + when + " (UTC)." });
        } else if (until > 0) {
          statusLines.push({
            tone: "warn",
            text: "Goes live in " + until + " day(s) on " + when + " (UTC).",
          });
        } else if (until === 0) {
          statusLines.push({ tone: "ok", text: "Publish-after is today — live on next deploy if Draft is off." });
        } else {
          statusLines.push({ tone: "ok", text: "Publish-after date passed — live on next deploy if Draft is off." });
        }
      }
      if (!draft && !publishAfter) {
        statusLines.push({ tone: "ok", text: "Not drafted/scheduled — Publish ships on the next deploy." });
      }

      if (kind === "videos" && data("video")) {
        var pipeline = [];
        pipeline.push({
          ok: true,
          label: "Video uploaded",
        });
        pipeline.push({
          ok: !!data("durationLabel"),
          label: data("durationLabel")
            ? "Duration " + data("durationLabel")
            : "Duration pending (auto after Publish)",
        });
        pipeline.push({
          ok: !!data("poster"),
          label: data("poster") ? "Poster set" : "Poster pending (auto if empty)",
        });
        pipeline.push({
          ok: !!data("captions") || (listFromImmutable(data("transcript")).length > 0),
          label: data("captions")
            ? "Captions file present"
            : listFromImmutable(data("transcript")).length
              ? "Transcript overrides present"
              : "Captions pending (Whisper after Publish)",
        });
      }

      return h(
        "div",
        { className: "wf-panel", id: this.props.forID },
        h("p", { className: "wf-panel__eyebrow" }, "Workflow"),
        h(
          "div",
          { className: "wf-panel__slug" },
          h("span", { className: "wf-panel__slug-label" }, "Public URL"),
          h("code", { className: "wf-panel__slug-url" }, "https://elleninpolitics.com" + urlPath),
          h(
            "p",
            { className: "wf-panel__slug-warn" },
            "Slug comes from the filename. Renaming after publish breaks old links."
          )
        ),
        h(
          "div",
          { className: "wf-panel__checks" },
          h(
            "p",
            { className: "wf-panel__checks-title" },
            "Ready " + readyCount + "/" + checks.length
          ),
          h(
            "ul",
            null,
            checks.map(function (item, i) {
              return h(
                "li",
                {
                  key: "c" + i,
                  className:
                    "wf-check " +
                    (item.soft ? "wf-check--soft" : item.ok ? "wf-check--ok" : "wf-check--miss"),
                },
                h("span", { "aria-hidden": true }, item.ok ? "✓" : "○"),
                " ",
                item.label
              );
            })
          )
        ),
        statusLines.length
          ? h(
              "ul",
              { className: "wf-panel__status" },
              statusLines.map(function (line, i) {
                return h(
                  "li",
                  { key: "s" + i, className: "wf-status wf-status--" + line.tone },
                  line.text
                );
              })
            )
          : null,
        kind === "videos" && data("video")
          ? h(
              "div",
              { className: "wf-pipeline" },
              h("p", { className: "wf-panel__checks-title" }, "After Publish pipeline"),
              h(
                "ul",
                null,
                [
                  {
                    ok: true,
                    label: "Video uploaded",
                  },
                  {
                    ok: !!data("durationLabel"),
                    label: data("durationLabel")
                      ? "Duration " + data("durationLabel")
                      : "Duration pending (auto)",
                  },
                  {
                    ok: !!data("poster"),
                    label: data("poster") ? "Poster set" : "Poster pending (auto if empty)",
                  },
                  {
                    ok:
                      !!data("captions") ||
                      listFromImmutable(data("transcript")).length > 0,
                    label: data("captions")
                      ? "Captions file present"
                      : listFromImmutable(data("transcript")).length
                        ? "Transcript overrides present"
                        : "Captions pending (Whisper)",
                  },
                ].map(function (step, i) {
                  return h(
                    "li",
                    {
                      key: "p" + i,
                      className: "wf-check " + (step.ok ? "wf-check--ok" : "wf-check--miss"),
                    },
                    h("span", { "aria-hidden": true }, step.ok ? "✓" : "…"),
                    " ",
                    step.label
                  );
                })
              ),
              h(
                "p",
                { className: "wf-panel__hint" },
                "Remux + captions usually take a few minutes. Refresh Watch after CI finishes."
              )
            )
          : null,
        notes.length
          ? h(
              "ul",
              { className: "wf-panel__notes" },
              notes.map(function (note, i) {
                return h("li", { key: "n" + i }, note);
              })
            )
          : null
      );
    },
  });

  CMS.registerWidget("workflow-panel", WorkflowPanelControl, EmptyPreview);
  // Keep old name working
  CMS.registerWidget("editorial-note", WorkflowPanelControl, EmptyPreview);

  /* ------------------------------------------------------------------ */
  /*  suggest-string — topic / series with chips                          */
  /* ------------------------------------------------------------------ */
  var SuggestStringControl = createClass({
    getInitialState: function () {
      return { suggestions: listFromImmutable(this.props.field.get("suggestions")) };
    },
    componentDidMount: function () {
      var self = this;
      var from = this.props.field.get("suggestions_from");
      if (!from) return;
      loadIndex().then(function (index) {
        var extra = index[from] || [];
        var base = listFromImmutable(self.props.field.get("suggestions"));
        var merged = Array.from(new Set(base.concat(extra)));
        if (self._mounted !== false) self.setState({ suggestions: merged });
      });
      this._mounted = true;
    },
    componentWillUnmount: function () {
      this._mounted = false;
    },
    onInput: function (event) {
      this.props.onChange(event.target.value);
    },
    pick: function (value) {
      this.props.onChange(value);
    },
    render: function () {
      var value = this.props.value || "";
      var suggestions = this.state.suggestions || [];
      return h(
        "div",
        { className: "suggest-string", id: this.props.forID },
        h("input", {
          className: this.props.classNameWrapper,
          type: "text",
          value: value,
          onChange: this.onInput,
          list: this.props.forID + "-list",
          placeholder: this.props.field.get("placeholder") || "",
        }),
        h(
          "datalist",
          { id: this.props.forID + "-list" },
          suggestions.map(function (item) {
            return h("option", { key: item, value: item });
          })
        ),
        suggestions.length
          ? h(
              "div",
              { className: "suggest-string__chips" },
              suggestions.map(
                function (item) {
                  return h(
                    "button",
                    {
                      type: "button",
                      key: item,
                      className:
                        "suggest-string__chip" +
                        (item === value ? " suggest-string__chip--active" : ""),
                      onClick: this.pick.bind(this, item),
                    },
                    item
                  );
                }.bind(this)
              )
            )
          : null
      );
    },
  });

  CMS.registerWidget("suggest-string", SuggestStringControl, EmptyPreview);

  /* ------------------------------------------------------------------ */
  /*  focal-point — click image to set crop                              */
  /* ------------------------------------------------------------------ */
  var FocalPointControl = createClass({
    // Decap's Widget wrapper only re-renders when this field's own value
    // changes, so replacing the cover image would leave a stale preview here.
    shouldComponentUpdate: function (nextProps) {
      if (
        this.props.value !== nextProps.value ||
        this.props.getAsset !== nextProps.getAsset ||
        this.props.classNameWrapper !== nextProps.classNameWrapper
      ) {
        return true;
      }
      var imageField = this.props.field.get("image_field") || "image";
      var cur =
        this.props.entry && this.props.entry.getIn
          ? this.props.entry.getIn(["data", imageField])
          : null;
      var next =
        nextProps.entry && nextProps.entry.getIn
          ? nextProps.entry.getIn(["data", imageField])
          : null;
      return cur !== next;
    },
    pick: function (value, event) {
      if (event) event.preventDefault();
      this.props.onChange(value);
    },
    onClickImage: function (event) {
      var rect = event.currentTarget.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width;
      var y = (event.clientY - rect.top) / rect.height;
      var focus = "center";
      if (y < 0.33) focus = "top";
      else if (y > 0.66) focus = "bottom";
      else if (x < 0.33) focus = "left";
      else if (x > 0.66) focus = "right";
      this.props.onChange(focus);
    },
    render: function () {
      var value = this.props.value || "center";
      var entry = this.props.entry;
      var imageField = this.props.field.get("image_field") || "image";
      var imagePath = entry && entry.getIn(["data", imageField]);
      var src = "";
      try {
        var asset = this.props.getAsset && this.props.getAsset(imagePath);
        src = asset && asset.toString ? asset.toString() : String(imagePath || "");
      } catch (err) {
        src = String(imagePath || "");
      }
      // Freshly uploaded (draft) covers aren't on the server yet; cms.js
      // shares blob previews for them via window.EllenCoverPreviews.
      var draftPreviews = window.EllenCoverPreviews || {};
      if (imagePath && draftPreviews[String(imagePath)]) {
        src = draftPreviews[String(imagePath)];
      }
      var options = ["center", "top", "bottom", "left", "right"];
      return h(
        "div",
        { className: "focal-point", id: this.props.forID },
        src
          ? h(
              "button",
              {
                type: "button",
                className: "focal-point__canvas",
                onClick: this.onClickImage,
                title: "Click to set focal point",
              },
              h("img", {
                src: src,
                alt: "",
                style: { objectPosition: focusToObjectPosition(value) },
              }),
              h("span", { className: "focal-point__badge" }, "Focus: " + value)
            )
          : h(
              "p",
              { className: "focal-point__empty" },
              "Add a cover/poster first, then click it here to set the crop."
            ),
        h(
          "div",
          { className: "focal-point__actions" },
          options.map(
            function (opt) {
              return h(
                "button",
                {
                  type: "button",
                  key: opt,
                  className:
                    "focal-point__btn" + (opt === value ? " focal-point__btn--active" : ""),
                  onClick: this.pick.bind(this, opt),
                },
                opt
              );
            }.bind(this)
          )
        )
      );
    },
  });

  CMS.registerWidget("focal-point", FocalPointControl, EmptyPreview);

  /* ------------------------------------------------------------------ */
  /*  featured-toggle — warn if another entry is already featured        */
  /* ------------------------------------------------------------------ */
  var FeaturedToggleControl = createClass({
    getInitialState: function () {
      return { others: [] };
    },
    componentDidMount: function () {
      var self = this;
      this._mounted = true;
      var kind = this.props.field.get("kind") || "posts";
      loadIndex().then(function (index) {
        var slug = entrySlug(self.props.entry);
        var list = (index[kind] || []).filter(function (item) {
          return item.featured && item.slug !== slug;
        });
        if (self._mounted) self.setState({ others: list });
      });
    },
    componentWillUnmount: function () {
      this._mounted = false;
    },
    toggle: function (event) {
      this.props.onChange(!!event.target.checked);
    },
    render: function () {
      var on = this.props.value === true;
      var others = this.state.others || [];
      return h(
        "div",
        { className: "featured-toggle", id: this.props.forID },
        h(
          "label",
          { className: "featured-toggle__label" },
          h("input", {
            type: "checkbox",
            checked: on,
            onChange: this.toggle,
          }),
          " ",
          this.props.field.get("toggle_label") || "Featured on homepage"
        ),
        on && others.length
          ? h(
              "p",
              { className: "featured-toggle__warn" },
              "Also marked featured: " +
                others
                  .map(function (item) {
                    return item.title;
                  })
                  .join(", ") +
                ". After you publish, the newest featured item keeps the homepage pin and the others are cleared automatically."
            )
          : h(
              "p",
              { className: "featured-toggle__hint" },
              "Pins the homepage feature. If more than one is marked, the newest by date wins and older pins are cleared after publish."
            )
      );
    },
  });

  CMS.registerWidget("featured-toggle", FeaturedToggleControl, EmptyPreview);

  /* ------------------------------------------------------------------ */
  /*  schedule-date — datetime + countdown helper                        */
  /* ------------------------------------------------------------------ */
  var ScheduleDateControl = createClass({
    onChange: function (event) {
      var value = event.target.value;
      this.props.onChange(value || undefined);
    },
    clear: function (event) {
      if (event) event.preventDefault();
      this.props.onChange(undefined);
    },
    render: function () {
      var raw = this.props.value ? String(this.props.value).slice(0, 10) : "";
      var until = daysUntil(raw);
      return h(
        "div",
        { className: "schedule-date", id: this.props.forID },
        h("input", {
          type: "date",
          className: this.props.classNameWrapper,
          value: raw,
          onChange: this.onChange,
        }),
        h(
          "div",
          { className: "schedule-date__meta" },
          raw
            ? h(
                "span",
                null,
                until == null
                  ? "Scheduled " + raw
                  : until > 0
                    ? "Goes live in " + until + " day(s)"
                    : until === 0
                      ? "Goes live today (next deploy)"
                      : "Date passed — live on next deploy if not drafted"
              )
            : h("span", null, "Optional — leave empty to publish with the next deploy"),
          raw
            ? h(
                "button",
                {
                  type: "button",
                  className: "cover-frame__btn cover-frame__btn--ghost",
                  onClick: this.clear,
                },
                "Clear"
              )
            : null
        )
      );
    },
  });

  CMS.registerWidget("schedule-date", ScheduleDateControl, EmptyPreview);

  /* ------------------------------------------------------------------ */
  /*  captions-status                                                    */
  /* ------------------------------------------------------------------ */
  var CaptionsStatusControl = createClass({
    render: function () {
      var entry = this.props.entry;
      var captions = entry && entry.getIn(["data", "captions"]);
      var transcript = listFromImmutable(entry && entry.getIn(["data", "transcript"]));
      var video = entry && entry.getIn(["data", "video"]);
      var status;
      var tone;
      if (captions) {
        status = "Captions file set — reopen Timed transcript after Whisper if you need wording fixes.";
        tone = "ok";
      } else if (transcript.length) {
        status = "Using manual timed transcript (" + transcript.length + " cues).";
        tone = "ok";
      } else if (video) {
        status = "No captions yet — auto-generated a few minutes after Publish.";
        tone = "pending";
      } else {
        status = "Upload a video first.";
        tone = "miss";
      }
      // Persist nothing meaningful
      if (this.props.value == null && this.props.onChange) {
        /* display-only */
      }
      return h(
        "div",
        { className: "captions-status captions-status--" + tone, id: this.props.forID },
        h("strong", null, "Captions"),
        h("p", null, status)
      );
    },
  });

  CMS.registerWidget("captions-status", CaptionsStatusControl, EmptyPreview);

  /* ------------------------------------------------------------------ */
  /*  related-posts multi picker                                         */
  /* ------------------------------------------------------------------ */
  var RelatedPostsControl = createClass({
    getInitialState: function () {
      return { posts: [] };
    },
    componentDidMount: function () {
      var self = this;
      this._mounted = true;
      loadIndex().then(function (index) {
        if (self._mounted) self.setState({ posts: index.posts || [] });
      });
    },
    componentWillUnmount: function () {
      this._mounted = false;
    },
    selected: function () {
      return listFromImmutable(this.props.value).map(String);
    },
    toggle: function (slug) {
      var current = this.selected();
      var next;
      if (current.indexOf(slug) >= 0) {
        next = current.filter(function (item) {
          return item !== slug;
        });
      } else {
        next = current.concat([slug]);
      }
      this.props.onChange(next);
    },
    render: function () {
      var self = this;
      var selected = this.selected();
      var currentSlug = entrySlug(this.props.entry);
      var posts = (this.state.posts || []).filter(function (post) {
        return post.slug !== currentSlug;
      });
      return h(
        "div",
        { className: "related-posts", id: this.props.forID },
        h(
          "p",
          { className: "related-posts__hint" },
          "Optional. If empty, the site suggests posts with the same topic."
        ),
        h(
          "ul",
          { className: "related-posts__list" },
          posts.map(function (post) {
            var on = selected.indexOf(post.slug) >= 0;
            return h(
              "li",
              { key: post.slug },
              h(
                "label",
                { className: "related-posts__item" + (on ? " is-on" : "") },
                h("input", {
                  type: "checkbox",
                  checked: on,
                  onChange: self.toggle.bind(self, post.slug),
                }),
                h("span", null, post.title),
                h("em", null, post.topic)
              )
            );
          })
        )
      );
    },
  });

  CMS.registerWidget("related-posts", RelatedPostsControl, EmptyPreview);

  /* ------------------------------------------------------------------ */
  /*  transcript-cues — clearer caption review table                     */
  /* ------------------------------------------------------------------ */
  var TranscriptCuesControl = createClass({
    cues: function () {
      return listFromImmutable(this.props.value).map(function (cue) {
        return {
          start: cue && cue.start != null ? Number(cue.start) : 0,
          end: cue && cue.end != null ? Number(cue.end) : 0,
          text: (cue && cue.text) || "",
        };
      });
    },
    commit: function (next) {
      this.props.onChange(next);
    },
    updateCue: function (index, key, value) {
      var next = this.cues();
      next[index] = Object.assign({}, next[index], { [key]: value });
      this.commit(next);
    },
    addCue: function (event) {
      if (event) event.preventDefault();
      var next = this.cues();
      var last = next[next.length - 1];
      var start = last ? Number(last.end) || 0 : 0;
      next.push({ start: start, end: start + 2, text: "" });
      this.commit(next);
    },
    removeCue: function (index, event) {
      if (event) event.preventDefault();
      var next = this.cues().filter(function (_cue, i) {
        return i !== index;
      });
      this.commit(next);
    },
    clearAll: function (event) {
      if (event) event.preventDefault();
      this.commit([]);
    },
    render: function () {
      var cues = this.cues();
      var self = this;
      return h(
        "div",
        { className: "transcript-cues", id: this.props.forID },
        h(
          "p",
          { className: "transcript-cues__hint" },
          "Review/fix Whisper lines here after captions land. Leave empty to use the .vtt as-is."
        ),
        h(
          "div",
          { className: "transcript-cues__toolbar" },
          h(
            "button",
            { type: "button", className: "cover-frame__btn", onClick: this.addCue },
            "Add cue"
          ),
          cues.length
            ? h(
                "button",
                {
                  type: "button",
                  className: "cover-frame__btn cover-frame__btn--danger",
                  onClick: this.clearAll,
                },
                "Clear all"
              )
            : null
        ),
        cues.length
          ? h(
              "div",
              { className: "transcript-cues__table" },
              cues.map(function (cue, index) {
                return h(
                  "div",
                  { className: "transcript-cues__row", key: "cue-" + index },
                  h("input", {
                    type: "number",
                    step: "0.1",
                    min: "0",
                    value: cue.start,
                    title: "Start seconds",
                    onChange: function (event) {
                      self.updateCue(index, "start", parseFloat(event.target.value) || 0);
                    },
                  }),
                  h("input", {
                    type: "number",
                    step: "0.1",
                    min: "0",
                    value: cue.end,
                    title: "End seconds",
                    onChange: function (event) {
                      self.updateCue(index, "end", parseFloat(event.target.value) || 0);
                    },
                  }),
                  h("textarea", {
                    value: cue.text,
                    rows: 2,
                    placeholder: "Cue text",
                    onChange: function (event) {
                      self.updateCue(index, "text", event.target.value);
                    },
                  }),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "cover-frame__btn cover-frame__btn--danger",
                      onClick: self.removeCue.bind(self, index),
                    },
                    "Remove"
                  )
                );
              })
            )
          : h("p", { className: "transcript-cues__empty" }, "No manual cues yet.")
      );
    },
  });

  CMS.registerWidget("transcript-cues", TranscriptCuesControl, EmptyPreview);

  /* ------------------------------------------------------------------ */
  /*  media-health — probe local asset paths                             */
  /* ------------------------------------------------------------------ */
  var MediaHealthControl = createClass({
    getInitialState: function () {
      return { results: [], checking: false };
    },
    componentDidMount: function () {
      this._mounted = true;
      this.recheck();
    },
    probeFields: function () {
      // Decap reserves the key "fields" for nested schemas — use probe_fields.
      return listFromImmutable(
        this.props.field.get("probe_fields") || this.props.field.get("fields")
      );
    },
    componentDidUpdate: function (prevProps) {
      var fields = this.probeFields();
      var changed = fields.some(
        function (name) {
          var a = this.props.entry && this.props.entry.getIn(["data", name]);
          var b = prevProps.entry && prevProps.entry.getIn(["data", name]);
          return a !== b;
        }.bind(this)
      );
      if (changed) this.recheck();
    },
    componentWillUnmount: function () {
      this._mounted = false;
    },
    recheck: function () {
      var self = this;
      var fields = this.probeFields();
      var paths = fields
        .map(function (name) {
          var value = self.props.entry && self.props.entry.getIn(["data", name]);
          return value ? String(value) : "";
        })
        .filter(Boolean);
      if (!paths.length) {
        this.setState({ results: [], checking: false });
        return;
      }
      this.setState({ checking: true });
      Promise.all(paths.map(probePath)).then(function (results) {
        if (self._mounted) self.setState({ results: results, checking: false });
      });
    },
    render: function () {
      var results = this.state.results || [];
      return h(
        "div",
        { className: "media-health", id: this.props.forID },
        h("p", { className: "wf-panel__checks-title" }, "Media health"),
        this.state.checking
          ? h("p", null, "Checking asset paths…")
          : results.length
            ? h(
                "ul",
                null,
                results.map(function (item, i) {
                  var label =
                    item.ok === true
                      ? "OK"
                      : item.ok === false
                        ? "Missing"
                        : "Unknown";
                  return h(
                    "li",
                    {
                      key: "m" + i,
                      className:
                        "wf-check " +
                        (item.ok === true
                          ? "wf-check--ok"
                          : item.ok === false
                            ? "wf-check--miss"
                            : "wf-check--soft"),
                    },
                    label + " — " + item.path
                  );
                })
              )
            : h("p", { className: "wf-panel__hint" }, "No local media paths to check yet."),
        h(
          "button",
          {
            type: "button",
            className: "cover-frame__btn",
            onClick: this.recheck,
          },
          "Re-check"
        )
      );
    },
  });

  CMS.registerWidget("media-health", MediaHealthControl, EmptyPreview);
})();
