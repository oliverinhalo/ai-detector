import { describe, expect, it } from 'vitest';
import { MAX_LOG_ODDS, discountedLogOdds, documentEvidence, sigmoid } from './signals';

function signal(text: string, id: string) {
  const found = documentEvidence(text).signals.find((s) => s.id === id);
  if (!found) throw new Error(`no signal named ${id}`);
  return found;
}

describe('documentEvidence', () => {
  it('assumes human with no evidence either way', () => {
    const e = documentEvidence('The cat sat on the mat. The dog did not.');
    expect(sigmoid(discountedLogOdds(e))).toBeLessThan(0.5);
  });

  it('keeps every signal normalised to 0..1', () => {
    const e = documentEvidence(
      'Moreover, it is important to note that this multifaceted paradigm ' +
        "underscores a pivotal shift. Let's be clear. Here's the thing — it isn't " +
        "simple. What's new is the scale.",
    );
    for (const s of e.signals) {
      expect(s.value).toBeGreaterThanOrEqual(0);
      expect(s.value).toBeLessThanOrEqual(1);
    }
  });

  it('pushes human-side signals negative and AI-side positive', () => {
    const human =
      "I think I'd rather not. I told my brother I'd do it myself, and I did, " +
      "and I'm still annoyed about it. My own fault. I'd said yes far too quickly, " +
      'the way I always do, and then spent my Saturday regretting it.';
    expect(signal(human, 'firstPerson').logOdds).toBeLessThan(0);
    expect(signal(human, 'contractions').logOdds).toBeLessThan(0);

    const machine =
      'Moreover, it is important to note that this multifaceted paradigm ' +
      'underscores a pivotal shift. Furthermore, the ever-evolving landscape ' +
      'showcases an intricate synergy that plays a crucial role throughout.';
    expect(signal(machine, 'lexicon').logOdds).toBeGreaterThan(0);
    expect(signal(machine, 'stockPhrases').logOdds).toBeGreaterThan(0);
  });

  it('counts first person without counting the editorial "we"', () => {
    // "We" is ambiguous — academic prose uses it constantly — so only genuine
    // first-person singular counts as a person behind the writing.
    const withWe = signal(
      'We observe that the sample was prepared accordingly.',
      'firstPerson',
    );
    expect(withWe.value).toBe(0);
  });

  it('reads concreteness from names and numbers', () => {
    const vague = signal(
      'The organisation reported that the relevant figures had increased considerably ' +
        'over the period in question, according to the available information.',
      'concreteness',
    );
    const concrete = signal(
      'Ofgem reported that Drax billed 41 pence more per unit in March 2024 than ' +
        'Centrica did, a gap of 11 per cent across 2,400 accounts in Yorkshire.',
      'concreteness',
    );
    expect(concrete.value).toBeGreaterThan(vague.value);
  });

  it('spots scaffolding in chat-style prose', () => {
    const e = signal(
      "Let's start with the basics. Here's the thing about this. So where does " +
        "this leave us? But let's be clear about what that means.",
      'scaffolding',
    );
    expect(e.value).toBeGreaterThan(0.5);
  });

  it('treats a lone stock word as unremarkable but a pile of them as evidence', () => {
    const plain =
      'This was a significant change for the team. We moved the whole operation ' +
      'into the old dairy building over one weekend in March, which in hindsight ' +
      'was not enough time. The floor had to come up first. Then the wiring, ' +
      'which nobody had looked at since the seventies and which turned out to ' +
      'run through a wall that was no longer there. Ruth found a wasp nest in ' +
      'the eaves on the Saturday and we lost most of the afternoon to that. By ' +
      'Sunday evening the benches were in and the kiln was wired, more or less, ' +
      'and we opened on the Tuesday with half the shelves still bare. Customers ' +
      'did not seem to mind. One asked whether we had always been there.';
    const stocked = Array.from(
      { length: 10 },
      () =>
        'This multifaceted tapestry underscores a pivotal paradigm, showcasing the ' +
        'intricate synergy of an ever-evolving landscape and a myriad of holistic realms.',
    ).join(' ');
    expect(signal(plain, 'lexicon').value).toBeLessThan(0.2);
    expect(signal(stocked, 'lexicon').value).toBeGreaterThan(0.6);
  });

  it('reads nothing into input too short to measure', () => {
    // A rate measured over eight words is noise, and one ordinary word should
    // not max out a document-level signal.
    for (const s of documentEvidence('This was a significant change for the team.').signals) {
      expect(s.value).toBeLessThan(0.5);
    }
  });
});

describe('certainty', () => {
  it('never claims more certainty than the ceiling allows', () => {
    const relentless = Array.from(
      { length: 60 },
      () =>
        'Moreover, it is important to note that this multifaceted paradigm ' +
        'underscores a pivotal and holistic tapestry of ever-evolving synergy.',
    ).join(' ');
    const lo = discountedLogOdds(documentEvidence(relentless));
    expect(lo).toBeLessThanOrEqual(MAX_LOG_ODDS);
    expect(sigmoid(lo)).toBeLessThan(0.98);
  });

  it('discounts evidence from very little text', () => {
    const sentence =
      'Moreover, this multifaceted paradigm underscores a pivotal holistic shift.';
    const short = documentEvidence(sentence);
    const long = documentEvidence(Array.from({ length: 10 }, () => sentence).join(' '));
    expect(short.confidence).toBeLessThan(long.confidence);
    expect(discountedLogOdds(short)).toBeLessThan(discountedLogOdds(long));
  });
});

describe('register signals', () => {
  it('spots the coaching register of a chatbot answering a how-to', () => {
    const e = signal(
      "Okay, so you want to get better at this? You're not alone! Most people feel " +
        "nervous, and that's completely normal. The key is to practice in small, " +
        'low-pressure settings first. Focus on your breathing, and remember that ' +
        "your audience wants you to succeed. You've got this!",
      'coaching',
    );
    expect(e.value).toBeGreaterThan(0.5);
  });

  it('does not convict a human writing how-to prose in the second person', () => {
    // Plenty of "you", none of the reassurance or imperative-advice phrasing.
    const e = signal(
      'You want the pan properly hot before anything goes in it. Not smoking, but ' +
        'close. If you put the butter in too early it goes brown and bitter while ' +
        'you are still faffing with the eggs. Crack the eggs into a bowl first.',
      'coaching',
    );
    expect(e.value).toBeLessThan(0.35);
  });

  it('spots the closing exhortation of an explainer', () => {
    const e = signal(
      'Understanding this process is essential for addressing challenges in ' +
        'agriculture. Continued innovation and policy support will be essential to ' +
        'sustaining this momentum. Nevertheless, challenges remain.',
      'exhortation',
    );
    expect(e.value).toBeGreaterThan(0.5);
  });
});

describe('style evidence needs corroboration', () => {
  const legal =
    'Pursuant to section 4 of the lease, the tenant is responsible for the upkeep ' +
    'of the interior and for any damage caused by negligence. The landlord retains ' +
    'responsibility for the structure, including the roof, gutters and external ' +
    'walls. Where a defect is reported in writing, the landlord shall inspect ' +
    'within fourteen days. If the tenant fails to give access on two occasions, ' +
    'the landlord may treat this as a breach. Rent is payable monthly in advance.';

  it('measures formal human prose as style-heavy with nothing to back it up', () => {
    const e = documentEvidence(legal);
    expect(e.styleLogOdds).toBeGreaterThan(1.5);
    expect(e.contentLogOdds).toBeLessThan(0.5);
  });

  it('caps that style evidence, so rhythm alone cannot convict a careful writer', () => {
    const e = documentEvidence(legal);
    // Without the cap the summed style evidence would carry it well above the prior.
    expect(e.logOdds).toBeLessThan(e.styleLogOdds + e.contentLogOdds + e.humanLogOdds);
    expect(sigmoid(discountedLogOdds(e))).toBeLessThan(0.4);
  });

  it('lets style evidence count once something corroborates it', () => {
    const corroborated = documentEvidence(
      legal +
        ' Moreover, it is important to note that this multifaceted framework ' +
        'underscores a pivotal paradigm. Furthermore, a comprehensive approach ' +
        'plays a crucial role in fostering seamless, holistic outcomes.',
    );
    const plain = documentEvidence(legal);
    expect(corroborated.contentLogOdds).toBeGreaterThan(1);
    expect(discountedLogOdds(corroborated)).toBeGreaterThan(discountedLogOdds(plain));
  });
});
