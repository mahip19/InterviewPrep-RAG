Behavioral Interview Deep Research Pack for the
Autonomous Driving Data Labeling Internship
Internship and team snapshot
The internship you shared is a Software Engineer Intern role in Autonomous Driving (AI Training – Data
Labeling) based in Sunnyvale 1 , with Russ Brennan 2 listed as the hiring manager. Your overview
describes a team that builds and operates human + machine labeling tooling and pipelines used to
produce “ground truth” training data for autonomy models, using a modern full‑stack stack (TypeScript/
React/GraphQL plus backend services in Python/Golang, with workflow orchestration such as Airflow).


Even without your exact internal org chart, publicly posted roles in GM’s autonomy ecosystem show the
same “center of gravity” around labeling as a product + platform: GM describes a “labeling ecosystem”
spanning UI tools for human annotation, workflow/efficiency optimization, and automatic +
semi‑automatic labeling (model-assisted tools, heuristics, and quality gates). 3


At the program level, GM describes its internship program as typically 10–12 weeks, with onboarding,
professional development, and networking built into the experience.   4




Why data labeling is strategically important to GM autonomy right
now
GM’s autonomy strategy has been publicly shifting toward autonomous capability in personally owned
vehicles rather than operating a robotaxi business. In early 2025, GM stated it would integrate Cruise 5
technology into its assisted-driving roadmap and refocus on personal-vehicle autonomy rather than
robotaxis. 6 This shift has been described publicly alongside safety and regulatory scrutiny following a
2023 incident in San Francisco 7 . 8


This context matters for your behavioral interview because it clarifies what “impact” means for a labeling/
tools intern: the work is not academic—it supports production-grade autonomy and validation. GM’s own
role descriptions emphasize that labeling must scale for ML customers with quality, throughput, and cost
efficiency tradeoffs, and that teams build KPIs that connect labeling to ML impact and cycle time. 3


GM also publicly frames autonomy as a long-term, iterative “software + data + validation” loop. A 2025 GM
announcement describes a future centralized compute platform targeting sizable gains in over‑the‑air
update capacity, bandwidth, and “AI performance for autonomy and advanced features,” reinforcing that
GM expects vehicles and autonomy systems to evolve continuously after launch. 9


When you combine (a) a strategic pivot to personal autonomy and (b) a “continuous learning” software
model, data labeling quality and lifecycle discipline becomes a core enabler—not a support function.




                                                    1
What multimodal labeling engineering looks like in practice
Multimodal autonomy data labeling is difficult because it must be consistent, scalable, and auditable
across multiple sensor modalities and over time.


A common pattern (and one that matches how many teams describe hybrid pipelines) is human-in-the-
loop (HITL) labeling: start with a base of manual labels, train an initial model, generate model pre‑labels for
new data, and then have humans review/correct those labels. Corrections feed back into model
improvement, letting automation take a larger share over time while humans focus on edge cases and
safety-critical ambiguity. 10


“Multimodal” in autonomy is not a buzzword. For example, the nuScenes dataset paper describes a full AV
sensor suite (multiple cameras plus radar and lidar) and highlights that the dataset is annotated with 3D
bounding boxes across many object classes, reflecting the real-world need to align perception labels across
sensors. 11


To appreciate why labeling tools and guidelines matter, it helps to look at real labeling specifications. The
Waymo 12 Open Dataset labeling specs illustrate how detailed and non-obvious “ground truth” rules get in
practice: 3D boxes are drawn tightly around visible portions of objects; occlusion triggers best‑effort
labeling; “no label zones” may be defined; and even what counts as part of a vehicle (mirrors included, small
protrusions excluded, trailers boxed separately, etc.) is explicitly specified. 13 These kinds of rules are
precisely where a tooling/platform team adds value: enforcing consistency, surfacing uncertainty, routing
hard cases, and measuring quality.


Under the hood, large labeling operations usually require workflow orchestration and robust ops.
Airflow’s own documentation positions it as popular for MLOps orchestration because pipelines are Python-
defined, extensible, data-agnostic, and include “day‑2 ops” features like retries, dependencies/branching,
monitoring, and alerting. 14 GM’s own autonomy engineering postings also reference experience with
“data orchestration pipelines or ETL systems (e.g., Airflow or similar)” as relevant for autonomy data
pipelines. 15


GM values, behaviors, and competencies the behavioral round is
actually scoring
GM explicitly describes its interview approach as competency-based and behavior-focused: interviews
concentrate on skills, knowledge, values, and behaviors, and GM recommends using the STAR format
with specific examples from prior experience. 16


Values and behaviors

Two public GM sources you have align closely with the “GM Values / Behaviors” image you shared:


     • GM’s careers culture page lists values including Customers, Excellence, Relationships, and Truth
       (“pursue facts and respectfully challenge assumptions”), and behaviors such as Win with Integrity,
       Innovate and Embrace Change, Speak Fearlessly, Lead as One Team, and Own the Outcome.
        17




                                                      2
     • GM’s interview toolkit uses the value wording Customers, Excellence, Relationships, Seek Truth,
       and behaviors such as Think Customer, Be Bold, Innovate Now, One Team, It’s On Me, Look
       Ahead, Win With Integrity, and Be Inclusive—with the explicit statement that these factors are
       used to evaluate talent. 18

The practical takeaway: you can treat the two sets as different “labels” for the same underlying rubric. In a
labeling/tools context, here’s how those tend to translate in interview scoring (inference grounded in GM’s
published definitions and what labeling platform roles emphasize):


     • Customers / Think Customer / Commit to Customers: your “customers” are often internal—ML
       engineers, operations labelers, safety/validation teams. Great answers show user empathy,
       requirements discovery, and measurable improvements in usability, throughput, or correctness. 19
     • Truth / Seek Truth / Speak Fearlessly: strong debugging stories, data-driven decision making, and
       respectful challenge (especially when a metric looks wrong or a pipeline is producing inconsistent
       results). 17
     • Win with Integrity / It’s On Me / Safety Conscious: in safety-critical domains, integrity and
       accountability are not abstract; GM’s code-of-conduct framing explicitly links integrity and safety, and
       encourages speaking up without fear of retaliation. 20
     • One Team / Lead as One Team / Relationships: collaboration across engineering + ML + operations
       is repeatedly emphasized for labeling ecosystems. 19

Competencies to expect in questions

GM’s interview toolkit lists competencies such as Customer Focus, Safety Conscious, Collaboration and
Teamwork, Technical & Professional Expertise, Solves Problems and Analyzes Issues, and Displays
High Integrity and Honesty, among others. 21


For your internship, the highest-probability competencies to be tested in a 30-minute behavioral round tend
to be: teamwork, problem solving, learning agility, ownership/accountability, and communication—because
these are observable in short interviews and map clearly to GM’s published behaviors. 22


What candidates report GM actually asks in internship behavioral
rounds
A consistent pattern across candidate reports is that internship interviews skew heavily behavioral,
sometimes with 1–2 role-relevant technical prompts, and that STAR structure is expected.


From Reddit’s r/GeneralMotors, posters commonly describe GM interviews as mostly situational/behavioral,
aimed at understanding thought process, problem solving, collaboration, and fit. 23 Another thread about
a 30-minute engineering internship interview describes very typical STAR prompts: a time you messed up
and fixed it, a hardest technical challenge, and a time you led something. 24


From Glassdoor entries for Software Engineer Intern interviews, candidates commonly report: - Starting
with “tell me about yourself / walk me through your background,” plus conflict-resolution or project deep
dives. 25
- In some cases, a mixed format where behavioral is followed by basic technical topics or a LeetCode-easy




                                                      3
style problem (e.g., string reversal / basic string parsing). 25
- In other cases, a behavioral-only interview round with a small number of questions.    26




The “Speak up for safety” pattern

One particularly GM-specific question theme that shows up in candidate anecdotes is “standing up for
safety.” In a recent Reddit thread, a GM employee/participant reported being asked to share an experience
where they “stood up for safety when it was uncomfortable.” 27 That theme aligns with GM’s published
emphasis on “Speak Up for Safety” and the broader integrity/safety framing in GM materials. 28


If you have any story that demonstrates: - noticing a safety, quality, privacy, or compliance risk, - escalating
respectfully with evidence, - and preventing harm (or improving a control/process), it will likely map strongly
to GM’s “integrity + safety” lens. 29


How to structure answers the way GM describes

GM’s toolkit and hiring guidance emphasize STAR, with focus on your individual actions, your rationale,
and the measurable result/impact. 30 Candidate-shared prep advice often converges on the same
practical tactic: prepare a small set of versatile stories (e.g., 6–7) that can be re-framed to answer different
prompts; keep answers concise; and explicitly include what you learned. 31


A strong story “bank” for this specific Data Labeling Engineering context typically includes:


     • A quality-critical bug or incident response: your detection method, containment, root cause, and
       the prevention step (monitoring, tests, tooling guardrails). This maps to Own the Outcome / It’s On
       Me / excellence. 32
     • A cross-functional delivery story: you worked with non-engineers (ops, PM, ML) and clarified
       requirements, built feedback loops, and shipped. This maps to One Team / relationships and to GM’s
       labeling ecosystem cross-functional nature. 33
     • A data-driven decision under ambiguity: you had partial data, designed a quick experiment or
       metric, and made a recommendation. This maps to Seek Truth / Look Ahead. 34
     • A “stand up for safety/quality” moment: you pushed back respectfully, proposed a safer
       alternative, and documented the rationale. 35
     • A learning sprint with new tooling: you ramped quickly (new framework/service/tool), got unstuck,
       and produced something reliable. GM explicitly frames interviews around how you apply technical
       and leadership skills; learning agility reads well here. 36
     • A customer/UX empathy story: you made an interface/tool easier and reduced friction or errors—
       highly relevant for annotation tooling where efficiency and error reduction are explicit goals. 33




                                                       4
Questions to ask that signal real fit for AI Training and Data
Labeling
GM’s own hiring guidance encourages asking your questions before the interview ends, and the labeling
ecosystem role descriptions emphasize metrics, tradeoffs, and cross-functional workflows. 37 In this niche
(labeling tools + pipelines), the highest-signal questions tend to be concrete and systems-oriented:


       • How does the team define and measure label quality today (gold sets, audits, disagreement
         handling), and what are the most important quality failure modes you’re currently tackling? 38
       • What parts of the labeling workflow are currently model-assisted versus fully manual, and what’s
         the roadmap for expanding semi-automatic labeling safely? 39
       • Which metrics matter most for the organization right now: annotation velocity, end-to-end cycle
         time, ML impact, cost, or coverage of specific driving scenarios—and how do you trade them off?
           40

       • Where do most “label defects” come from in your pipeline: unclear guidelines, tool UX, sensor
         ambiguity, model prelabel error, or operational processes? 41
       • How is work orchestrated: what kinds of workflows run through orchestration (e.g., DAGs for
         ingestion → task creation → QA → export), and what reliability guarantees are most important? 42
       • What does successful collaboration look like between Data Labeling Engineering and ML teams
         (perception/planning/validation)? What are the fastest feedback loops you’ve found? 40
       • What are the most common “hard cases” in your labeling domain (occlusion, long-tail objects, sensor
         alignment), and how do your tools help annotators handle them consistently? 43
       • For interns specifically: what’s an example of an intern project that created lasting value (feature
         shipped, metric added, tool reliability improved), and how is impact evaluated? 44



 1   17   19    Culture | Working at GM | General Motors Careers
https://search-careers.gm.com/en/working-at-gm/culture/

 2   25   26    General Motors (GM) Software Engineer Intern Interview Experience & Questions | Glassdoor
https://www.glassdoor.com/Interview/General-Motors-GM-Software-Engineer-Intern-Interview-Questions-
EI_IE279.0%2C17_KO18%2C42.htm

 3   33   38    39   40   Senior Product Manager, Labeling, Sunnyvale, California plus 1 location | General Motors
Careers
https://search-careers.gm.com/en/jobs/jr-202603651/senior-product-manager-labeling/

 4   Early Career Professionals | General Motors Careers
https://search-careers.gm.com/en/early-careers/

 5   11   nuScenes: A Multimodal Dataset for Autonomous Driving
https://openaccess.thecvf.com/content_CVPR_2020/papers/
Caesar_nuScenes_A_Multimodal_Dataset_for_Autonomous_Driving_CVPR_2020_paper.pdf

 6   GM takes full control of Cruise in autonomous personal vehicle shift | Reuters
https://www.reuters.com/business/autos-transportation/general-motors-acquires-full-ownership-cruise-autonomous-
business-2025-02-04/

 7   18   21    30   34   36   search-careers.gm.com
https://search-careers.gm.com/media/euri3exg/gm-interview-toolkit-2022-translated.pdf




                                                             5
 8   General Motors Cuts Funding to Cruise, Nixing Its Robotaxi Plan | WIRED
https://www.wired.com/story/general-motors-cuts-funding-to-cruise-robotaxis

 9   GM announces eyes-off driving, conversational AI, and unified software platform
https://news.gm.com/home.detail.html/Pages/news/us/en/2025/oct/1022-UM-GM-eyes-off-driving-conversational-AI-unified-
software-platform.html

10   Automated Data Labeling: Techniques and Use Cases | CVAT
https://www.cvat.ai/resources/blog/automated-data-labeling-guide

12   16   22   32   37   How We Hire | General Motors Careers
https://search-careers.gm.com/en/how-we-hire/

13   41    waymo-open-dataset/docs/labeling_specifications.md at master · waymo-research/waymo-open-
          43

dataset · GitHub
https://github.com/waymo-research/waymo-open-dataset/blob/master/docs/labeling_specifications.md

14   42   MLOps | Apache Airflow
https://airflow.apache.org/use-cases/mlops/

15   Senior Software Engineer, Mapping, Austin plus 4 locations | General Motors Careers
https://search-careers.gm.com/zh/%E5%B7%A5%E4%BD%9C/jr-202602974/senior-software-engineer-mapping/

20   28   29   35   d2f5upgbvkx8pz.cloudfront.net
https://d2f5upgbvkx8pz.cloudfront.net/sites/default/files/inline-files/WWI.pdf

23   Interview technical questions : r/GeneralMotors
https://www.reddit.com/r/GeneralMotors/comments/1qj67sb/interview_technical_questions/

24   30 minute engineering internship interview : r/GeneralMotors
https://www.reddit.com/r/GeneralMotors/comments/sc2y74/30_minute_engineering_internship_interview/

27   GM Internship Interview Help : r/GeneralMotors
https://www.reddit.com/r/GeneralMotors/comments/1qf5n0l/gm_internship_interview_help/

31   Hiring and Interview Process (for those who have questions) : r/GeneralMotors
https://www.reddit.com/r/GeneralMotors/comments/q01hs7/hiring_and_interview_process_for_those_who_have/

44   Early Careers | General Motors Careers
https://search-careers.gm.com/en/early-careers/internship-program/




                                                                6
