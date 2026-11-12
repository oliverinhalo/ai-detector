/**
 * Held-out validation passages.
 *
 * Written after the detectors were tuned and never used to adjust them. The
 * passages in `corpus.ts` were all, at one point or another, looked at while
 * fitting weights — including the ones labelled `blind` there, which stopped
 * being blind once they were used to diagnose failures. These ones are the
 * honest estimate, and they are deliberately awkward: AI that writes in the
 * first person and cites real figures, AI imitating an informal blog, and
 * humans writing in the flat, impersonal registers that detectors libel.
 *
 * Still hand-written for this project, so still not proof of real-world
 * accuracy — see `corpus/README.md`.
 */
import type { Passage } from './corpus';

export const VALIDATION: Omit<Passage, 'split'>[] = [
  {
    id: 'v-ai-firstperson-specifics',
    label: 'ai',
    kind: 'AI with first person and figures',
    text: `When I started tracking my household energy use in January 2024, I was surprised by what I found. Our monthly consumption averaged 412 kilowatt-hours, roughly 15 percent above the regional median reported by the utility. By replacing the three oldest appliances and adjusting our thermostat schedule, we reduced that figure to 348 kilowatt-hours within four months. The experience taught me that meaningful savings often come from small, consistent adjustments rather than dramatic changes. I would encourage anyone considering similar steps to begin with a simple audit of their current usage.`,
  },
  {
    id: 'v-ai-fake-blog',
    label: 'ai',
    kind: 'AI imitating an informal blog',
    text: `So I finally tried making kimchi at home, and honestly? It was easier than I expected. The hardest part was finding gochugaru, which I eventually tracked down at a Korean grocery about twenty minutes away. Once I had everything, the process was pretty straightforward: salt the cabbage, rinse it, mix the paste, pack it into jars. I'll admit I was nervous about the fermentation stage. But after three days on the counter, it smelled exactly right. If you've been putting this off, I'd say go for it — the results are worth the effort.`,
  },
  {
    id: 'v-ai-technical',
    label: 'ai',
    kind: 'AI technical documentation',
    text: `The caching layer operates on a least-recently-used eviction policy with a configurable maximum size. When a request arrives, the system first checks whether a valid entry exists for the given key. If the entry is present and has not expired, it is returned immediately, avoiding an upstream call. Otherwise, the request proceeds to the origin server and the response is stored before being returned to the client. Administrators can tune both the time-to-live and the maximum entry count to balance memory consumption against hit rate.`,
  },
  {
    id: 'v-ai-argumentative',
    label: 'ai',
    kind: 'AI opinion column',
    text: `The debate over remote learning has become unnecessarily polarized. Advocates point to flexibility and accessibility, while critics emphasize isolation and reduced engagement. Both positions contain merit, and the evidence supports neither extreme. What the research actually suggests is that outcomes depend heavily on implementation quality, student age, and the availability of reliable technology at home. Rather than asking whether remote learning works, we should be asking under what conditions it works, for whom, and at what cost to those it does not serve well.`,
  },
  {
    id: 'v-human-flat-report',
    label: 'human',
    kind: 'human incident report (flat, impersonal)',
    text: `The outage began at 03:12 and affected the booking system only. Payments and the customer portal continued to operate normally throughout. The on-call engineer was paged at 03:14 and acknowledged at 03:19. Initial investigation pointed to the connection pool, which had been resized during the previous evening's deployment. Rolling back that change restored service at 04:06. A total of 1,840 booking attempts failed during the window. We have added an alert on pool saturation and scheduled a review of the deployment checklist for Thursday.`,
  },
  {
    id: 'v-human-instructions',
    label: 'human',
    kind: 'human how-to (second person)',
    text: `You want the pan properly hot before anything goes in it. Not smoking, but close. If you put the butter in too early it goes brown and bitter while you are still faffing with the eggs, and then you have to start again, which I have done more times than I will admit. Crack the eggs into a bowl first. Do not crack them straight into the pan, whatever the television chefs do. Three eggs, a pinch of salt, and beat them properly, about twenty seconds. Then in, and keep them moving.`,
  },
  {
    id: 'v-human-formal-academic',
    label: 'human',
    kind: 'human academic abstract',
    text: `This paper examines the relationship between municipal bond ratings and local newspaper closures across 312 counties between 2004 and 2019. Using a difference-in-differences design, we find that counties losing their only daily newspaper experienced an average increase of 11 basis points in borrowing costs within three years. The effect persists after controlling for population change, median income and prior fiscal condition. We interpret this as evidence that local media performs a monitoring function whose loss is priced by lenders, and we discuss implications for the literature on information asymmetry in public finance.`,
  },
  {
    id: 'v-human-personal-essay',
    label: 'human',
    kind: 'human personal essay',
    text: `My father kept his tools in a biscuit tin, which tells you most of what you need to know about him. Not a toolbox. A tin, with a picture of a Scottish glen on the lid, rusted through at one corner. Inside: two screwdrivers, a bradawl, a roll of insulating tape gone tacky with age, and a quantity of screws that had come out of things and might go back into other things. He fixed everything with those. Badly, mostly. The bathroom door never shut properly again after 1987.`,
  },
  {
    id: 'v-human-forum-reply',
    label: 'human',
    kind: 'human forum reply',
    text: `Had the same thing on a 2014 Octavia. Turned out to be the rocker cover gasket, not the turbo like two garages told me. You can usually tell because the oil collects in the spark plug wells — pull one and look. Cost me 90 quid in the end including labour, versus the 1200 I was quoted for a turbo. Worth checking before you commit to anything expensive. Also if it is only doing it when cold that points away from the turbo as well.`,
  },
  {
    id: 'v-ai-listicle',
    label: 'ai',
    kind: 'AI listicle prose',
    text: `Improving your sleep quality does not require expensive gadgets or dramatic lifestyle overhauls. Start by establishing a consistent schedule, going to bed and waking at the same time even on weekends. Next, consider your environment: a cool, dark room signals to your body that it is time to rest. Limiting screen exposure in the hour before bed can also make a meaningful difference, as blue light interferes with melatonin production. Finally, be patient with yourself. Building better sleep habits takes time, but the benefits to your energy and focus are well worth the effort.`,
  },
  {
    id: 'v-human-review',
    label: 'human',
    kind: 'human product review',
    text: `Bought this to replace a Dualit that died after eleven years, so my expectations were probably unfair. It toasts fine. The outside gets hot enough that I would not let a child near it, which is not mentioned anywhere in the listing. The crumb tray is a nuisance to remove and I have given up doing it weekly. Two slices of ordinary bread on setting four comes out about right; anything seeded needs setting three or it catches. For the money I would buy it again, grudgingly.`,
  },
  {
    id: 'v-human-meeting-notes',
    label: 'human',
    kind: 'human meeting notes (terse)',
    text: `Present: RK, Dawit, Marie, me. Apologies from Tomas. Budget line for the summer programme is short by about 4k, mostly because the hall hire went up in April and nobody told us. Marie to ask whether the parish will hold last year's rate if we book all six dates at once. Dawit raised the safeguarding training again — still four volunteers outstanding, deadline end of June. Agreed we will not advertise the second session until the numbers are confirmed. Next meeting 14th, usual time, and RK will bring the revised figures.`,
  },
];
