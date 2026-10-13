import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const widgets = new Map();
vm.runInNewContext(
  readFileSync(new URL("../public/admin/cms.js", import.meta.url), "utf8"),
  {
    window: {
      createClass: (definition) => definition,
      CMS: {
        registerWidget: (name, control) => widgets.set(name, control),
        registerPreviewTemplate() {},
        registerPreviewStyle() {},
      },
    },
  },
);

function entry(data) {
  return { getIn: ([, key]) => data[key] };
}

function coverControl() {
  const control = widgets.get("cover-frame");
  return {
    ...control,
    props: {
      value: "",
      field: new Map([["focus_field", "poster_focus"]]),
      entry: entry({ orientation: "portrait", poster_focus: "50% 50%" }),
    },
    state: control.getInitialState(),
  };
}

test("Decap's props-only update during video upload does not crash the cover", () => {
  const control = coverControl();
  // Widget.js calls the bound control method with nextProps only.
  const update = control.shouldComponentUpdate.bind(control);
  assert.equal(update({ ...control.props }), false);
  assert.equal(update({
    ...control.props,
    entry: entry({ orientation: "portrait", poster_focus: "50% 50%", video: "/uploads/videos/clip.mp4" }),
  }), false);
  assert.equal(update({ ...control.props, value: "/uploads/covers/new.jpg" }), true);
});

test("cover still updates for library selections, orientation, and focal point", () => {
  const control = coverControl();
  for (const changes of [
    { mediaPaths: new Map([[control.state.controlID, "/uploads/covers/new.jpg"]]) },
    { entry: entry({ orientation: "landscape", poster_focus: "50% 50%" }) },
    { entry: entry({ orientation: "portrait", poster_focus: "25% 75%" }) },
  ]) {
    assert.equal(control.shouldComponentUpdate({ ...control.props, ...changes }), true);
  }
});

test("React state updates still refresh drag, upload, and error feedback", () => {
  const control = coverControl();
  assert.equal(control.shouldComponentUpdate(control.props, { ...control.state }), false);
  for (const changes of [
    { dragging: true },
    { uploading: true },
    { error: "Upload failed" },
    { brokenSrc: "/uploads/covers/missing.jpg" },
  ]) {
    assert.equal(control.shouldComponentUpdate(control.props, { ...control.state, ...changes }), true);
  }
});
