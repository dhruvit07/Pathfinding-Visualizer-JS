import { describe, it, expect } from 'vitest';
import { LearningModal } from '../../src/ui/LearningModal';

describe('LearningModal Component', () => {
  it('instantiates safely in Node environment without throwing', () => {
    const modal = new LearningModal();
    expect(modal.visible).toBe(false);
  });

  it('toggles and manages visibility safely', () => {
    const modal = new LearningModal();
    expect(modal.visible).toBe(false);

    modal.close();
    expect(modal.visible).toBe(false);

    modal.switchTab('heuristics');
    modal.switchTab('matrix');
    modal.switchTab('applications');
    modal.switchTab('shortcuts');
    expect(modal.visible).toBe(false);
  });
});
