import {describe, expect, it} from 'vitest';
import {currentSnapshot} from './current-snapshot';
import {parseSnapshot} from './parse';
import {withBrandContent} from '../../../../contracts/brand-content';
import type {MessageTree} from '../../../../contracts/content';

// Independent acceptance strings transcribed from the brand workbook's replacement column.
const approved = [
  [34, 'Tablet.spec2', 'Certified with TUV80 - 80% Blue Light Reduction (BLR)'],
  [45, 'Plans.palTitle', 'Ola (OlaGo included)'],
  [113, 'Pal.lede', 'Brings stories to life, joins the conversation, interactive avatars and offers gentle support through the day.'],
  [116, 'Pal.magicBody', 'Interact with custom avatars with the intelligent voice service.'],
  [117, 'Pal.syncedBody', 'Designed to respond to stories and support conversations with characters.'],
  [124, 'Pal.kids1', 'Character projection'],
  [124, 'Pal.kids2', 'Voice interaction'],
  [124, 'Pal.kids3', 'Custom voice bedtime stories'],
  [128, 'Pal.way2Body', 'As the story changes, new interactions and abilities appear. Talk with the characters in your favorite story.'],
  [132, 'Pal.sb5', 'Ambient light and soft white notice that keep you company till morning.'],
  [20, 'Tablet.step4Title', 'Interact with storybook characters'],
] as const;
const get = (tree: MessageTree, path: string): unknown => path.split('.').reduce<unknown>((v,k) => (v as MessageTree)[k],tree);

describe('brand verbatim replacement acceptance', () => {
  it('supersedes row 129 rollout wording only after the brand confirmed listed functions complete and the owner requested removal', () => {
    // Brand reply YyT0dXQBeo4wYCxmBoacZHwQnSJ, block XoFPdDzxloAp4rxX9MvcjlaPnDd;
    // owner confirmation 2026-11-03. All other verbatim row assertions below remain.
    expect(get(currentSnapshot.messages.en,'Pal.way3Body')).toBe('More characters, more conversation context, more avatars.');
    expect(get(currentSnapshot.messages['zh-hant'],'Pal.way3Body')).toBe('更多角色、更多對話上下文、更多虛擬角色。');
    expect(get(currentSnapshot.messages['zh-hant'],'Pal.synced')).toBe('與熟悉的角色互動');
  });
  for (const [row,path,text] of approved) {
    it(`row ${row}: ${path} matches the supplied English exactly`, () => {
      expect(get(currentSnapshot.messages.en,path)).toBe(text);
    });
  }
  it('row 102 preserves the exact title and punctuation', () => {
    expect(get(currentSnapshot.messages.en,'Products.title1') + String(get(currentSnapshot.messages.en,'Products.title2'))).toBe('Interaction.Reimagined.');
  });
  it('accepts a saved 17-question FAQ and adds the new question without rewriting it', () => {
    const old = structuredClone(currentSnapshot);
    delete old.messages.en.BrandStoryFaq;
    (old.messages.en.BrandFaq as MessageTree).a2 = 'Saved audience copy';
    expect(() => parseSnapshot(old)).not.toThrow();
    const display=withBrandContent(old);
    expect((display.messages.en.BrandFaq as MessageTree).a2).toBe('Saved audience copy');
    expect((display.messages.en.BrandStoryFaq as MessageTree).question).toBe('Can Tablet interact with OLA storybook characters?');
    expect(old.messages.en.BrandStoryFaq).toBeUndefined();
  });
  it('retains a saved edit to the new story question', () => {
    const snapshot=structuredClone(currentSnapshot);
    (snapshot.messages.en.BrandStoryFaq as MessageTree).answer='Saved story answer';
    expect((withBrandContent(parseSnapshot(snapshot)).messages.en.BrandStoryFaq as MessageTree).answer).toBe('Saved story answer');
  });
  it('can render an older saved release without the new presentation namespace', () => {
    const snapshot = structuredClone(currentSnapshot);
    delete snapshot.messages.en.BrandPresentation;
    const display = withBrandContent(parseSnapshot(snapshot));
    expect(get(display.messages.en, 'BrandPresentation.olago.stepsTitle')).toBe('Keep track of your steps');
    expect(snapshot.messages.en.BrandPresentation).toBeUndefined();
  });
  it('preserves CMS edits to shared-template supporting copy', () => {
    const snapshot = withBrandContent(structuredClone(currentSnapshot));
    const presentation = snapshot.messages.en.BrandPresentation as MessageTree;
    (presentation.olago as MessageTree).stepsBody = 'Edited in the content manager';
    const display = withBrandContent(parseSnapshot(snapshot));
    expect(get(display.messages.en, 'BrandPresentation.olago.stepsBody')).toBe('Edited in the content manager');
  });
});
