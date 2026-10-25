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

function uploadControl(widget, persist) {
  const definition = widgets.get(widget);
  const changes = [];
  const control = {
    ...definition,
    _mounted: true,
    props: {
      value: '/uploads/existing.mov',
      field: new Map([['public_folder', '/uploads/videos']]),
      onPersistMedia: persist,
      onChange: value => changes.push(value),
    },
    state: definition.getInitialState(),
    setState(update) { Object.assign(this.state, update); },
  };
  return { control, changes };
}

for (const widget of ['video-file', 'cover-frame']) {
  for (const [scenario, persist] of [
    ['failure action', () => Promise.resolve({ type: 'MEDIA_PERSIST_FAILURE', payload: {} })],
    ['rejection', () => Promise.reject(new Error('Offline'))],
    ['synchronous exception', () => { throw new Error('Session expired'); }],
    ['unexpected response', () => Promise.resolve({ type: 'UNKNOWN' })],
  ]) {
    test(`${widget}: ${scenario} keeps the existing file and allows retry`, async () => {
      const { control, changes } = uploadControl(widget, persist);
      await control.ingestFile({ name: 'Video.mov', type: widget === 'cover-frame' ? 'image/jpeg' : 'video/quicktime', size: 13208214 });
      assert.deepEqual(changes, []);
      assert.equal(control.state.uploading, false);
      assert.match(control.state.error, /Couldn’t upload/);
    });
  }
  test(`${widget}: cancelled replacement does not attach an invented path`, async () => {
    const { control, changes } = uploadControl(widget, () => undefined);
    await control.ingestFile({ name: 'Video.mov', type: widget === 'cover-frame' ? 'image/jpeg' : 'video/quicktime', size: 13208214 });
    assert.deepEqual(changes, []);
    assert.equal(control.state.uploading, false);
  });
  for (const result of [
    { type: 'MEDIA_PERSIST_SUCCESS', payload: { file: { name: 'video.mov', path: 'public/uploads/videos/video.mov' }, privateUpload: false } },
    { type: 'ADD_DRAFT_ENTRY_MEDIA_FILE', payload: { name: 'video.mov', path: 'public/uploads/videos/video.mov' } },
  ]) {
    test(`${widget}: ${result.type} attaches the confirmed file`, async () => {
      const { control, changes } = uploadControl(widget, () => result);
      await control.ingestFile({ name: 'Video.mov', type: widget === 'cover-frame' ? 'image/jpeg' : 'video/quicktime', size: 13208214 });
      assert.deepEqual(changes, ['/uploads/videos/video.mov']);
      assert.equal(control.state.uploading, false);
    });
  }
}

 test('video size limit respects hosting even with stale 95 MB config', () => {
  const { control, changes } = uploadControl('video-file', () => { throw new Error('Should not upload'); });
  control.props.field.set('max_mb', 95);
  control.ingestFile({ name: 'large.mov', size: 26 * 1024 * 1024 });
  assert.deepEqual(changes, []);
  assert.match(control.state.error, /24MB/);
});

test('publishing waits for the upload to finish', () => {
  const { control } = uploadControl('video-file', () => undefined);
  control.state.uploading = true;
  assert.match(control.isValid().error.message, /Wait/);
  control.state.uploading = false;
  assert.equal(control.isValid().error, false);
});
