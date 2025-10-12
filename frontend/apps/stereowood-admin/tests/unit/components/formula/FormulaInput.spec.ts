import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import FormulaInput from '@/components/formula/FormulaInput.vue';
import { ElInput, ElTag, ElIcon } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';

async function flushAllPromises() {
  await nextTick();
  await nextTick();
}

describe('FormulaInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits change payload with parsed tokens when typing', async () => {
    const wrapper = mount(FormulaInput, {
      props: {
        modelValue: '',
        fetchSuggestions: vi.fn().mockResolvedValue([]),
      },
      global: {
        components: {
          ElInput,
          ElTag,
          ElIcon,
          Loading,
        },
        stubs: {
          transition: false,
        },
      },
    });

    const textarea = wrapper.find('textarea');
    expect(textarea.exists()).toBe(true);

    await textarea.setValue('钛白粉 1g');
    await flushAllPromises();

    const changeEvents = wrapper.emitted('change');
    expect(changeEvents).toBeTruthy();
    const lastPayload = changeEvents?.at(-1)?.[0];
    expect(lastPayload.value).toBe('钛白粉 1g');
    expect(lastPayload.tokens).toHaveLength(1);
    expect(lastPayload.tokens[0]).toMatchObject({
      name: '钛白粉',
      base: 1,
      unit: 'g',
    });
    expect(lastPayload.hash).toMatch(/^h[0-9a-f]+$/);
  });

  it('loads suggestions and applies selection', async () => {
    const fetchMock = vi.fn().mockResolvedValue([
      {
        name: '群青',
        frequency: 10,
        sources: { customColors: 6, rawMaterials: 3, manual: 1 },
        units: ['g'],
        extras: ['MM-1002'],
      },
    ]);
    const wrapper = mount(FormulaInput, {
      props: {
        modelValue: '',
        fetchSuggestions: fetchMock,
      },
      global: {
        components: {
          ElInput,
          ElTag,
          ElIcon,
          Loading,
        },
        stubs: {
          transition: false,
        },
      },
    });

    const textarea = wrapper.find('textarea');
    await textarea.trigger('focus');
    await vi.runOnlyPendingTimersAsync();
    await flushAllPromises();

    const suggestion = wrapper.find('.formula-input__suggestion');
    expect(suggestion.exists()).toBe(true);

    await suggestion.trigger('mousedown');
    await flushAllPromises();

    const updateEvents = wrapper.emitted('update:modelValue');
    expect(updateEvents).toBeTruthy();
    const latestValue = updateEvents?.at(-1)?.[0];
    expect(latestValue).toContain('群青');
  });
});

