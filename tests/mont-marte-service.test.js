const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const queriesModulePath = require.resolve('../backend/db/queries/montMarteColors');
require.cache[queriesModulePath] = {
  exports: {
    getAll: async () => {
      throw new Error('Default queries should not be used in tests');
    },
    getById: async () => {
      throw new Error('Default queries should not be used in tests');
    },
    getBasicById: async () => {
      throw new Error('Default queries should not be used in tests');
    },
    insertColor: async () => {
      throw new Error('Default queries should not be used in tests');
    },
    updateColor: async () => {
      throw new Error('Default queries should not be used in tests');
    },
    deleteColor: async () => {
      throw new Error('Default queries should not be used in tests');
    },
  },
};

const dbModulePath = require.resolve('../backend/db');
require.cache[dbModulePath] = { exports: { db: {} } };

const formulaModulePath = require.resolve('../backend/services/formula');
require.cache[formulaModulePath] = {
  exports: {
    cascadeRenameInFormulas: async () => 0,
  },
};

const serviceModule = require('../backend/services/MontMarteService');
const { MontMarteService } = serviceModule;

test('createColor trims fields and normalises optional data', async () => {
  let insertedPayload;
  const queries = {
    insertColor: async (payload) => {
      insertedPayload = payload;
      return 12;
    },
    getById: async (id) => ({ id, ...insertedPayload }),
    getAll: async () => [],
    getBasicById: async () => null,
    updateColor: async () => {},
    deleteColor: async () => 0,
  };

  const service = new MontMarteService({ queries });
  const result = await service.createColor({
    name: '  New Shade  ',
    category: ' Tools ',
    categoryId: 7,
    supplierId: undefined,
    purchaseLinkId: 9,
    imageFilename: 'image.png',
  });

  assert.equal(result.id, 12);
  assert.equal(insertedPayload.name, 'New Shade');
  assert.equal(insertedPayload.category, 'Tools');
  assert.equal(insertedPayload.category_id, 7);
  assert.equal(insertedPayload.supplier_id, null);
  assert.equal(insertedPayload.purchase_link_id, 9);
  assert.equal(insertedPayload.image_path, 'image.png');
});

test('createColor rejects empty inputs for name or category', async () => {
  const queries = {
    insertColor: async () => {
      throw new Error('should not insert');
    },
    getById: async () => null,
    getAll: async () => [],
    getBasicById: async () => null,
    updateColor: async () => {},
    deleteColor: async () => 0,
  };

  const service = new MontMarteService({ queries });

  await assert.rejects(
    () => service.createColor({ name: '  ', categoryId: 3 }),
    { message: '颜色名称不能为空' }
  );

  await assert.rejects(
    () => service.createColor({ name: 'Valid', category: '   ' }),
    { message: '原料类别不能为空' }
  );
});

test('createColor treats textual null category as empty when id present', async () => {
  let insertedPayload;
  const queries = {
    insertColor: async (payload) => {
      insertedPayload = payload;
      return 42;
    },
    getById: async (id) => ({ id, ...insertedPayload }),
    getAll: async () => [],
    getBasicById: async () => null,
    updateColor: async () => {},
    deleteColor: async () => 0,
  };

  const service = new MontMarteService({ queries });
  await service.createColor({
    name: 'Valid',
    category: ' null ',
    categoryId: 5,
  });

  assert.equal(insertedPayload.category, null);
  assert.equal(insertedPayload.category_id, 5);
});

test('updateColor cascades rename and discards replaced image', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mont-service-'));
  try {
    const existingImage = path.join(tempDir, 'existing.png');
    await fs.writeFile(existingImage, 'original');

    let updatePayload;
    const queries = {
      getBasicById: async () => ({ id: 10, name: 'Original', image_path: 'existing.png' }),
      updateColor: async (id, payload) => {
        updatePayload = payload;
      },
      getById: async () => ({ id: 10, name: 'Renamed', image_path: 'fresh.png' }),
      insertColor: async () => 0,
      getAll: async () => [],
      deleteColor: async () => 0,
    };

    const fakeDb = { label: 'db' };
    let cascadeArguments;
    const cascadeRenameInFormulas = async (...args) => {
      cascadeArguments = args;
      return 4;
    };

    const service = new MontMarteService({
      queries,
      cascadeRenameInFormulas,
      db: fakeDb,
      uploadRoot: tempDir,
    });

    const result = await service.updateColor(10, {
      name: '  Renamed ',
      category: ' Tools ',
      categoryId: 2,
      supplierId: 3,
      purchaseLinkId: null,
      uploadedImage: 'fresh.png',
    });

    assert.equal(updatePayload.name, 'Renamed');
    assert.equal(updatePayload.category, 'Tools');
    assert.equal(updatePayload.image_path, 'fresh.png');
    assert.deepEqual(cascadeArguments, [fakeDb, 'Original', 'Renamed']);
    assert.equal(result.updatedReferences, 4);

    await assert.rejects(
      fs.access(existingImage),
      (error) => error && error.code === 'ENOENT'
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('deleteColor removes stored image and returns success message', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mont-service-'));
  try {
    const storedImage = path.join(tempDir, 'color.png');
    await fs.writeFile(storedImage, 'data');

    const queries = {
      getBasicById: async () => ({ id: 5, name: 'Color', image_path: 'color.png' }),
      deleteColor: async () => 1,
      insertColor: async () => 0,
      getById: async () => null,
      getAll: async () => [],
      updateColor: async () => {},
    };

    const service = new MontMarteService({ queries, uploadRoot: tempDir });
    const result = await service.deleteColor(5);

    assert.deepEqual(result, { success: true, message: '颜色删除成功' });
    await assert.rejects(
      fs.access(storedImage),
      (error) => error && error.code === 'ENOENT'
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

