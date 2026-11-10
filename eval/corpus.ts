/**
 * Labelled benchmark passages. Honest caveats: these were written by hand for this
 * project (the "human" ones imitate varied human registers, the "AI" ones imitate
 * typical chatbot output), so this is a regression benchmark, NOT proof of accuracy
 * on real-world text. `split: 'tune'` passages were used while adjusting the
 * detectors; `split: 'holdout'` passages were scored during tuning and also ended up informing it, so treat them as
 * tune-adjacent. `split: 'blind'` passages were written after the last tuning change and never used to adjust anything.
 */
export interface Passage {
  id: string;
  label: 'human' | 'ai';
  split: 'tune' | 'holdout' | 'blind';
  kind: string;
  text: string;
}

export const CORPUS: Passage[] = [
  // ---------- HUMAN, tune ----------
  {
    id: 'h-blog-1',
    label: 'human',
    split: 'tune',
    kind: 'casual blog',
    text: `I've been baking bread for about three years now and I still get it wrong half the time. Last weekend my loaf came out like a brick. Dense, gummy, a crust you could knock on like a door. My partner ate two slices anyway, which is love. The culprit, I think, was the kitchen: it was freezing, so the dough barely rose. Lesson learned? Not really. I'll probably make the same mistake in January. But there's something about the smell that keeps me coming back, even when the result is embarrassing, and honestly the failures taste okay with enough butter.`,
  },
  {
    id: 'h-academic-1',
    label: 'human',
    split: 'tune',
    kind: 'formal student essay',
    text: `The causes of the First World War are still argued over by historians. Some stress the alliance system, which tied the great powers together so that a quarrel in the Balkans could pull in Russia, Germany and France. Others point to militarism and the railway timetables that made mobilisation hard to stop once begun. I find the second argument more convincing, although it cannot explain why Austria-Hungary chose war in the first place. Fischer's claim that Germany wanted a war is bold, but his sources are mostly from after 1912. In short, no single cause will do; the war came from several pressures meeting at a bad moment.`,
  },
  {
    id: 'h-email-1',
    label: 'human',
    split: 'tune',
    kind: 'email',
    text: `Hi Marcus, thanks for getting back to me so quickly. I looked over the quote and, to be blunt, the second line item is way off from what we discussed on the phone. You said 400 for the install, not 650. Can you check? If it's a typo, fine, no harm done. If not, I need to talk to my boss before we go ahead, and she's out until Thursday. Also, the delivery date: is Friday still realistic? My brother is flying in and I'd like the kitchen to look like a kitchen by then. Let me know, and sorry for the barrage of questions.`,
  },
  {
    id: 'h-news-1',
    label: 'human',
    split: 'tune',
    kind: 'local news',
    text: `A fire at a recycling plant on Mill Road forced about 60 residents from their homes on Tuesday night, officials said. Nobody was hurt. Crews from four stations spent six hours bringing the blaze under control, and the road stayed shut until mid-morning. "It was like a wall of smoke," said Denise Hartley, who lives two doors down. "My dog wouldn't stop barking." The cause is not yet known. The plant's owner, Greenline Materials, said it would cooperate with the fire service and has promised to cover hotel costs for anyone displaced.`,
  },
  {
    id: 'h-fiction-1',
    label: 'human',
    split: 'tune',
    kind: 'fiction',
    text: `The door stuck, as it always did in wet weather, and Tom had to put his shoulder to it. Inside, the cottage smelled of damp wool and old tea. He dropped his bag. Nothing had moved since March: the chair by the window, her glasses folded on the sill, the calendar still showing a month that had ended. He stood there a long while. A car passed outside, slow, its headlights sliding over the ceiling and gone. Then he went to the kitchen, filled the kettle, and told himself he would only stay the one night.`,
  },
  {
    id: 'h-forum-1',
    label: 'human',
    split: 'tune',
    kind: 'forum post',
    text: `Ok so update on the laptop thing. Reinstalled Windows, still bluescreens when I open Chrome with more than ~10 tabs. RAM test passed (ran it overnight) so I don't think it's that. Weird part: it only happens on battery. Plugged in it's fine?? Swapped the charger just to see, no change. Anyone seen this before? I'm half ready to throw it out the window. My cousin reckons it's the GPU driver but I rolled that back twice already. Thanks for all the ideas so far, you lot have been way more useful than Dell support, who told me to "try turning it off and on again".`,
  },
  {
    id: 'h-lab-1',
    label: 'human',
    split: 'tune',
    kind: 'lab report',
    text: `We measured the period of a pendulum at five different lengths and plotted T squared against L. The graph is roughly a straight line, as expected, though the point at 80 cm sits well below it. I think we mis-timed that run, because the stopwatch was started late. The gradient gives g as 9.6 m/s², about 2% under the accepted value. Our biggest source of error was probably reaction time; we counted only ten swings each time, and a longer count would have helped. If we repeated this, we would use a photogate instead of a hand-held watch.`,
  },
  {
    id: 'h-nonnative-1',
    label: 'human',
    split: 'tune',
    kind: 'non-native writer',
    text: `In my country the education is very different from here. We have exam each year and if you fail, you must do the year again. My father he say this is good because students are serious. I am not sure. When I came to this university I was afraid, because the teachers ask opinion in class and I never do this before. Now it is more easy for me. I think group work is useful, but sometimes one person do all the work and the others only put their name. This is not fair for the person who work hard.`,
  },
  {
    id: 'h-review-1',
    label: 'human',
    split: 'tune',
    kind: 'product review',
    text: `Bought this kettle after my old one died in a puff of smoke. First impressions: heavy, solid, looks great on the counter. Boils fast, maybe two minutes for a full litre. The lid is a pain though. It sticks, and twice now I've burned my thumb trying to get it open. The water also tastes faintly of plastic for the first week, which put me off. Three stars. Would I buy it again? Probably not, but my wife loves it, so it stays. If you've got big hands you'll hate the handle.`,
  },
  // ---------- HUMAN, holdout ----------
  {
    id: 'h-blog-2',
    label: 'human',
    split: 'holdout',
    kind: 'casual blog',
    text: `Moved flats last month and I'm still finding boxes I forgot to unpack. Found one marked "misc kitchen" that had a single whisk and a birthday candle. The new place is nice, don't get me wrong, but the neighbour upstairs practises the trombone at 7am. Seven! On a Sunday! I left a polite note. He replied with a drawing of a sad trombone. We're fine now, actually, and he's promised to switch to afternoons. Small wins. Anyway, if you know a good plumber in the Leeds area, my shower has opinions about water pressure and I'm losing the argument.`,
  },
  {
    id: 'h-academic-2',
    label: 'human',
    split: 'holdout',
    kind: 'formal student essay',
    text: `Shakespeare's Macbeth presents ambition as something that grows on what it feeds on. At the start Macbeth hesitates; he tells his wife that they will "proceed no further in this business". By the end he kills without thought. Lady Macbeth changes too, but in the opposite direction, because her confidence collapses into the sleepwalking scene. This mirror structure is, in my view, the play's cleverest move. It suggests that guilt does not fall evenly on people. Critics such as Bradley read Macbeth as tragic, but I would argue he is closer to a warning than a hero, since we never really want him to win.`,
  },
  {
    id: 'h-memoir-1',
    label: 'human',
    split: 'holdout',
    kind: 'memoir',
    text: `My grandmother kept a tin of buttons on top of the fridge, and as a kid I thought it was treasure. She'd let me tip them onto the table and sort them by colour while she shelled peas. Nobody told me they came off my grandfather's old coats. When I found out, years later, I cried in the car park of a Tesco. Silly. I still have the tin, dented now, and every so often I rattle it just to hear that noise. It sounds like her kitchen. It sounds like Sundays, mostly.`,
  },
  {
    id: 'h-technical-1',
    label: 'human',
    split: 'holdout',
    kind: 'engineer notes',
    text: `Spent most of today chasing a memory leak in the image resizer. Turns out we weren't closing the stream when a decode failed, so every bad upload leaked about 4 MB. Not huge, but we get thousands of bad uploads a day from that one partner. Fixed with a try/finally and a test that feeds it garbage. I also noticed the retry logic doubles the timeout each time, which is fine, except there's no cap, so one request waited eleven minutes. I'll add a cap tomorrow. Honestly I'm surprised this survived so long without anyone noticing.`,
  },
  {
    id: 'h-formal-human-1',
    label: 'human',
    split: 'holdout',
    kind: 'formal human (hard case)',
    text: `The committee reviewed the proposal for the new pedestrian crossing on Elm Street and noted that traffic counts were taken on only two days. Members were concerned that this was an inadequate basis for the cost estimate. The chair requested that further counts be conducted during term time, when school traffic is heaviest. Councillor Reyes objected to the delay, arguing that two accidents had already occurred at the junction. The motion to defer was carried by five votes to three. The clerk will circulate revised figures before the next meeting, and residents will be invited to comment in writing.`,
  },
  {
    id: 'h-fiction-2',
    label: 'human',
    split: 'holdout',
    kind: 'fiction',
    text: `Ines counted the stairs the way she always did, thirty-one, and stopped at the landing because the light was out again. Somebody was cooking fish. Somewhere a baby cried and was hushed. She felt for the key in her coat, found a receipt, a mint, a hair tie, no key. Of course. Behind her the street door banged and a man's voice said, "You're blocking the way, love." She turned to say something sharp and found she had nothing, just a tired smile, and let him pass.`,
  },
  // ---------- AI, tune ----------
  {
    id: 'a-essay-1',
    label: 'ai',
    split: 'tune',
    kind: 'essay',
    text: `Social media has fundamentally transformed the way people communicate in the modern world. On one hand, it offers unprecedented opportunities for connection, allowing individuals to share ideas and maintain relationships across vast distances. On the other hand, it presents significant challenges, including concerns about privacy, misinformation, and mental health. It is important to note that the impact of social media varies depending on how it is used. Ultimately, fostering digital literacy and encouraging mindful usage can help individuals harness the benefits of these platforms while mitigating their potential drawbacks.`,
  },
  {
    id: 'a-report-1',
    label: 'ai',
    split: 'tune',
    kind: 'business report',
    text: `Effective project management is essential for organizations seeking to achieve their strategic objectives. By establishing clear goals, allocating resources efficiently, and fostering open communication, teams can navigate complex challenges and deliver high-quality results. Furthermore, leveraging data-driven insights enables stakeholders to make informed decisions and adapt to changing circumstances. A robust risk management framework also plays a pivotal role in identifying potential obstacles before they escalate. In summary, a holistic approach to project management contributes to sustained organizational success and long-term growth.`,
  },
  {
    id: 'a-history-1',
    label: 'ai',
    split: 'tune',
    kind: 'history summary',
    text: `The Industrial Revolution was a pivotal period in human history that reshaped economies, societies, and daily life. Beginning in Britain in the late eighteenth century, it was characterized by the transition from manual labor to machine-based manufacturing. Key innovations, such as the steam engine and the spinning jenny, significantly increased productivity and enabled the growth of urban centers. However, this rapid transformation also brought challenges, including poor working conditions and environmental degradation. Overall, the legacy of the Industrial Revolution continues to influence the modern world in profound ways.`,
  },
  {
    id: 'a-health-1',
    label: 'ai',
    split: 'tune',
    kind: 'health explainer',
    text: `Maintaining a balanced diet is crucial for overall health and well-being. A variety of nutrient-rich foods, including fruits, vegetables, whole grains, and lean proteins, provide the essential vitamins and minerals the body needs to function optimally. Additionally, regular physical activity supports cardiovascular health, strengthens muscles, and improves mood. It is also worth noting that adequate sleep and stress management play a significant role in maintaining a healthy lifestyle. By adopting these habits, individuals can enhance their quality of life and reduce the risk of chronic conditions.`,
  },
  {
    id: 'a-tech-1',
    label: 'ai',
    split: 'tune',
    kind: 'tech explainer',
    text: `Artificial intelligence is rapidly changing the landscape of modern technology. Machine learning algorithms can analyze vast amounts of data, identify patterns, and make predictions with remarkable accuracy. These capabilities have led to significant advancements in fields such as healthcare, finance, and transportation. Nevertheless, the widespread adoption of AI raises important ethical considerations, including bias, transparency, and accountability. To address these concerns, developers and policymakers must work collaboratively to ensure that AI systems are designed responsibly and deployed in ways that benefit society as a whole.`,
  },
  {
    id: 'a-casual-1',
    label: 'ai',
    split: 'tune',
    kind: 'casual-prompted AI',
    text: `Let's be real: Monday mornings can feel like a lot. But here's the thing, a little preparation goes a long way. Start by laying out your clothes the night before, so you're not scrambling when the alarm goes off. Next, keep your breakfast simple and nutritious to fuel your day. Finally, take a few minutes to review your priorities, which helps you stay focused and feel in control. With these small habits in place, you'll be well on your way to a smoother, more productive start to the week.`,
  },
  {
    id: 'a-story-1',
    label: 'ai',
    split: 'tune',
    kind: 'AI fiction',
    text: `The old lighthouse stood at the edge of the cliff, its weathered stone walls a testament to the passage of time. Elara climbed the spiral staircase, her heart pounding with a mixture of fear and anticipation. At the top, she discovered a dusty journal filled with intricate sketches and cryptic notes. As she turned the pages, a sense of wonder washed over her. The secrets of the lighthouse were finally beginning to unravel, and she knew that her life would never be the same again.`,
  },
  {
    id: 'a-product-1',
    label: 'ai',
    split: 'tune',
    kind: 'product copy',
    text: `Discover the ultimate solution for your home organization needs. Our premium storage system seamlessly combines style and functionality, offering a versatile way to keep your space tidy. Crafted from high-quality materials, it is designed to withstand daily use while enhancing the aesthetic of any room. Whether you are decluttering your living room or optimizing your office, this innovative product empowers you to create an environment that is both efficient and inviting. Elevate your lifestyle today and experience the difference that thoughtful design can make.`,
  },
  // ---------- AI, holdout ----------
  {
    id: 'a-essay-2',
    label: 'ai',
    split: 'holdout',
    kind: 'essay',
    text: `Education plays a vital role in shaping individuals and societies. Through formal instruction, students acquire the knowledge and skills necessary to participate meaningfully in the workforce and civic life. Moreover, education fosters critical thinking, creativity, and empathy, qualities that are essential in an increasingly interconnected world. However, disparities in access to quality education remain a significant challenge. Addressing these inequalities requires sustained investment, innovative teaching methods, and a commitment to inclusivity. By prioritizing education, societies can build a more equitable and prosperous future for all.`,
  },
  {
    id: 'a-science-1',
    label: 'ai',
    split: 'holdout',
    kind: 'science explainer',
    text: `Photosynthesis is the process by which plants, algae, and some bacteria convert light energy into chemical energy. During this process, chlorophyll absorbs sunlight, which drives the conversion of carbon dioxide and water into glucose and oxygen. This reaction is fundamental to life on Earth, as it provides the oxygen we breathe and forms the base of most food chains. Furthermore, photosynthesis helps regulate atmospheric carbon dioxide levels, contributing to climate stability. Understanding this process is essential for addressing challenges in agriculture and renewable energy.`,
  },
  {
    id: 'a-casual-2',
    label: 'ai',
    split: 'holdout',
    kind: 'casual-prompted AI',
    text: `Honestly, learning to cook doesn't have to be intimidating. Here's the secret: start with a few simple recipes and build from there. Pick something forgiving, like a stir-fry or a pasta dish, and focus on getting comfortable with basic techniques. Don't worry if things don't turn out perfectly the first time, because every mistake is a chance to learn. Over time, you'll develop a feel for flavors and timing, and cooking will become a rewarding part of your routine. So grab an apron, take a deep breath, and enjoy the process!`,
  },
  {
    id: 'a-travel-1',
    label: 'ai',
    split: 'holdout',
    kind: 'travel blurb',
    text: `Nestled in the heart of Tuscany, Siena is a captivating destination that offers a rich blend of history, culture, and culinary delights. Visitors can explore the medieval streets, marvel at the stunning Gothic cathedral, and experience the vibrant atmosphere of Piazza del Campo. Additionally, the surrounding countryside boasts breathtaking landscapes, charming vineyards, and authentic trattorias. Whether you are a history enthusiast or a food lover, Siena promises an unforgettable experience that will leave you with lasting memories of your Italian adventure.`,
  },
  {
    id: 'a-policy-1',
    label: 'ai',
    split: 'holdout',
    kind: 'policy analysis',
    text: `Renewable energy policy is a critical component of national efforts to reduce greenhouse gas emissions. Governments can implement a range of measures, including tax incentives, feed-in tariffs, and renewable portfolio standards, to encourage investment in clean technologies. These policies not only reduce environmental impact but also stimulate economic growth by creating new jobs and industries. That said, policymakers must carefully balance competing priorities, such as affordability, grid reliability, and equity. A comprehensive and adaptable approach is therefore necessary to ensure a successful energy transition.`,
  },
  {
    id: 'a-reflection-1',
    label: 'ai',
    split: 'holdout',
    kind: 'student reflection (AI)',
    text: `Reflecting on my learning journey this semester, I have gained valuable insights into teamwork and communication. Working collaboratively with my peers allowed me to appreciate diverse perspectives and develop stronger problem-solving skills. Through this experience, I learned that effective communication is the foundation of any successful project. Moving forward, I plan to apply these lessons to future endeavors, ensuring that I continue to grow both personally and professionally. Overall, this course has been a transformative experience that has equipped me with essential skills for my future career.`,
  },
  {
    id: 'hb-1',
    label: 'human',
    split: 'blind',
    kind: 'formal human (hard case)',
    text: `The study examined whether the timing of fertiliser application affects wheat yield on clay soils. Twelve plots were treated in March, and twelve in April, with all other conditions held constant. Mean yield in the March plots was 7.4 tonnes per hectare, compared with 6.9 in April, a difference that was statistically significant (p = 0.03). The authors caution that a single growing season cannot account for weather variation. Further trials across three years are planned, and the results will be shared with local growers' associations once the analysis is complete.`,
  },
  {
    id: 'hb-2',
    label: 'human',
    split: 'blind',
    kind: 'casual blog',
    text: `So my sister dared me to run a 10k and, because I have no self-control, I said yes. Training week one: I ran for four minutes and had to sit on a wall. A man walking a spaniel asked if I was okay. I was not okay. By week five though, something weird happened, I actually looked forward to it. The route by the canal is gorgeous at 6am when it's all mist and ducks. Race day is in October. My goal is simple: finish before the sandwiches run out at the end, because I hear they're good.`,
  },
  {
    id: 'hb-3',
    label: 'human',
    split: 'blind',
    kind: 'student essay (plain)',
    text: `I think the main problem with the book is the ending. Orwell spends nearly the whole novel building up Winston as someone who might fight back, and then in the last chapters he just gives in. At first I was angry about that. But after rereading it for class, I started to see that was the point: if a hero could beat the Party, the book would be telling us we are safe, and Orwell clearly didn't want that. Still, the torture scenes are hard to read. My teacher said that's deliberate too, and I'll take her word for it.`,
  },
  {
    id: 'hb-4',
    label: 'human',
    split: 'blind',
    kind: 'interview transcript-ish',
    text: `Well, we started out of a garage, my brother and me, around 2009. Nobody wanted our stuff. We'd drive to markets at four in the morning and sell maybe six jars of chutney. Six! Then one day a woman from a deli in Bath tried it, bought forty, and that was that. I wouldn't say it was luck exactly, but it wasn't a plan either. We still use Mum's recipe. We changed the labels, because the old ones looked, frankly, like they'd been drawn by a toddler, which they had.`,
  },
  {
    id: 'hb-5',
    label: 'human',
    split: 'blind',
    kind: 'formal human (hard case)',
    text: `Pursuant to section 4 of the lease, the tenant is responsible for the upkeep of the interior and for any damage caused by negligence. The landlord retains responsibility for the structure, including the roof, gutters and external walls. Where a defect is reported in writing, the landlord shall inspect within fourteen days. If the tenant fails to give access on two occasions, the landlord may treat this as a breach. Rent is payable monthly in advance, and any increase requires two months' notice. Disputes should first be referred to the agreed mediator before any court action is considered.`,
  },
  {
    id: 'ab-1',
    label: 'ai',
    split: 'blind',
    kind: 'essay',
    text: `Remote work has become an increasingly prominent feature of the contemporary workplace. It offers employees greater flexibility, reduces commuting time, and can improve work-life balance. At the same time, it presents challenges related to communication, collaboration, and company culture. Organizations that succeed in this environment typically invest in clear processes, reliable technology, and regular opportunities for connection. By embracing a thoughtful approach to remote work, businesses can attract top talent and remain competitive in a rapidly changing economy.`,
  },
  {
    id: 'ab-2',
    label: 'ai',
    split: 'blind',
    kind: 'AI with specifics',
    text: `In 2023, global electric vehicle sales exceeded 14 million units, according to the International Energy Agency. China accounted for roughly 60 percent of this total, followed by Europe and the United States. This growth reflects falling battery costs, expanding charging infrastructure, and supportive government policies such as tax credits and emissions regulations. Nevertheless, challenges remain, including supply chain constraints for critical minerals and uneven access to charging in rural areas. Continued innovation and policy support will be essential to sustaining this momentum.`,
  },
  {
    id: 'ab-3',
    label: 'ai',
    split: 'blind',
    kind: 'casual-prompted AI',
    text: `Okay, so you want to get better at public speaking? You're not alone! Most people feel nervous, and that's completely normal. The key is to practice in small, low-pressure settings first, like presenting to a friend or recording yourself on your phone. Focus on your breathing, slow down your pace, and remember that your audience wants you to succeed. With consistent effort, you'll gradually build confidence and find your own authentic voice. You've got this!`,
  },
  {
    id: 'ab-4',
    label: 'ai',
    split: 'blind',
    kind: 'literary AI',
    text: `The city woke slowly, its streets humming with the quiet promise of a new day. Maya stepped outside, the cool morning air filling her lungs as she gazed at the skyline. Everything felt possible. She thought of her grandmother's words, a gentle reminder that courage is not the absence of fear but the willingness to move forward despite it. With a deep breath, she began to walk, ready to embrace whatever the future held.`,
  },
  {
    id: 'ab-5',
    label: 'ai',
    split: 'blind',
    kind: 'academic AI',
    text: `The relationship between sleep and cognitive performance has been extensively studied in recent decades. Research indicates that insufficient sleep impairs attention, memory consolidation, and decision-making. Moreover, chronic sleep deprivation has been associated with an increased risk of anxiety and depression. These findings suggest that sleep should be regarded not as a luxury but as a fundamental component of health. Future research should explore the mechanisms underlying these effects and identify effective interventions for improving sleep quality across diverse populations.`,
  },
];
