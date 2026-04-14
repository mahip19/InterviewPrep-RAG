GM Behavioral Interview Prep
SWE Intern — Autonomous Driving, AI Training / Data Labeling

30 min | Virtual | Microsoft Teams | Manager: Russ Brennan




FORMAT
      ~3-4 behavioral questions + time for your questions
      STAR method expected
      Each answer: 90-120 seconds. One deeper story: up to 150 seconds if they ask follow ups
      Reserve 5-7 minutes at end for your questions
      Possible light technical prompts through project deep dives even in "behavioral" round
      Safety and quality are the lens through which everything is evaluated




GM INTRODUCTION (60-90 seconds)
    I'm Mahip, a Master's student in CS at Northeastern, currently in my third semester. Before grad school, I
    worked as a software engineer in India for a year on a product support team. My job was to help maintain
    production systems, handle upgrades, run QA checks before sites went live, and support internal developers
    when they hit platform issues. That experience gave me a strong appreciation for production reliability and
    quality.
    Since starting my masters, I've built a distributed file storage system in C++ focused on fault tolerance and
    data integrity, a Java based calendar system focused on clean architecture and rigorous testing, and a full
    stack learning management system. This semester I'm diving into AWS and machine learning.
    What excites me about this role is that the Data Labeling team builds the tools that create ground truth for
    autonomous driving. The quality of your labels directly affects how well the models perform, which
    directly affects safety on the road. That's not just software engineering, that's mission critical work. And the
    fact that the team spans the full stack plus ML pipelines and workflow orchestration is exactly the kind of
    environment where I'd grow fast.




THE 6 MOST LIKELY QUESTIONS AND YOUR ANSWERS
Based on the research, these are the highest probability questions for this specific role:
Q1: "Tell me about a time you messed up and had to fix it"
GM signals: Own the Outcome / Win with Integrity / Safety Conscious

Use Story C — Client Email Escalation

    Situation: After a client website upgrade, it was my responsibility to go through a QA checklist before
    giving the green flag to map the live URL. During these checks, I found a UI bug with the publish button.
    Task: Before testing, I disabled the client email notification toggle so they wouldn't get alerts while I
    debugged. But the site's cache was stale, so my change never actually took effect.
    Action: Every click I made fired an email to the actual client. It got escalated. Before the meeting, I sat
    with my team and traced the root cause. In the meeting, I explained exactly what happened honestly and
    gave a live demo showing how stale cache prevents configuration changes from taking effect. I didn't try to
    hide what happened.
    Result: The client was satisfied. My manager backed me up because I came prepared with the root cause,
    not excuses. I learned that taking a precaution isn't enough. You need to verify it actually worked. Since
    then, I always validate my changes are reflected before proceeding, especially on production systems.

GM power phrases to weave in: "I validated rather than assumed," "I owned the outcome and drove the fix
through verification"




Q2: "Tell me about a time you disagreed with a teammate on approach"
GM signals: Be Bold / Speak Fearlessly / Lead as One Team / Seek Truth

Use Story B — Testing Disagreement

    Situation: Final phase of our calendar project. We had to add several new features and build a new GUI.
    Our target was 100% mutation test coverage.
    Task: My teammate wanted to implement everything first and test at the end. I was concerned because
    mutation coverage requires really thorough tests. Cramming them at the end would mean weaker tests and
    lower quality.
    Action: I spoke up about my concern. Instead of just insisting on my approach, I suggested we align on
    what mattered most. We agreed that both speed and quality were non negotiable. So we compromised: test
    each feature's core behavior as we built it, save edge cases for later. We made a checklist, split the work,
    and rotated between implementing and testing.
    Result: We finished before the deadline with 100% functionality and 98% mutation test coverage. The
    quality didn't suffer because we never let untested code pile up. I learned that when you disagree, focus on
    shared priorities first. The solution usually follows.

GM power phrases: "I raised the concern early and proposed options," "I optimized for quality first, then
throughput"
Q3: "Tell me about a time you improved a process or innovated"
GM signals: Innovate Now / Takes Initiative / Solves Problems

Use Story A — Automation Script

    Situation: My team was asked to produce a report showing what software versions each of our 900+ client
    websites were running across dev, staging, and production environments.
    Task: The only way was to manually log into each website's backend and note the versions. At that scale, it
    would take the team weeks and be error prone.
    Action: I proposed automating the whole thing. Built a script in Java using Selenium that logged into each
    website, pulled the version info, and output everything into an Excel sheet. Halfway through, I discovered a
    bunch of old URLs that were completely dead but nobody had tracked. I flagged this to my manager and he
    realized we could get the version report and a cleanup of dead infrastructure at the same time.
    Result: Delivered version details for every active website. 400+ dev, 300+ staging, 270+ production. The
    script was documented on Confluence and pushed to Bitbucket for reuse. Other teams asked for the report
    for their own purposes. One person, one script, replaced what would have taken the whole team weeks
    manually.

GM power phrases: "I saw a bottleneck and proposed a solution before being asked," "I validated the output
against known sites to ensure accuracy"




Q4: "Tell me about your hardest technical challenge"
GM signals: Seek Truth / Technical Expertise / Solves Problems

Use Story E — Distributed File System

    Situation: For my distributed systems course, my partner and I built a file storage system from scratch in
    C++. I had zero experience with TCP socket programming.
    Task: I took on building the entire networking layer. The system needed to handle concurrent clients and
    survive node failures.
    Action: The raw TCP code got messy fast, so I refactored into clean wrapper classes. The hardest bug was
    messages between server and client not deserializing correctly. The data looked fine on the sending side but
    was garbled on the receiving end. I formed a hypothesis that the issue was message boundaries. After
    investigation, I confirmed there was no way to tell where one message ended and the next began. I designed
    a length prefix protocol where every message is prepended with its size so the receiver always knows how
    many bytes to read.
    Result: The fix resolved the issue completely. The system ended up handling 128+ concurrent connections
    with sub 200ms latency and 99.5% availability during node failures. I learned to approach debugging by
    collecting signals, forming hypotheses, and testing them systematically rather than making random
    changes.

GM power phrases: "I pursued the root cause rather than patching the symptom," "I instrumented and tested
hypotheses before changing code"




Q5: "Tell me about a time you had to learn something new quickly"
GM signals: Practices Self Development / Innovate and Embrace Change

Use Story D — Not Asking for Help

    Situation: First job out of college. I joined the product support team and was given access to the codebase
    to learn the product. Completely new domain, new tools, new environment.
    Task: I spent two weeks going through the code alone, Googling everything, never asking my teammates
    who were sitting right next to me. I had this mindset that I should figure it out myself.
    Action: After two weeks, my manager told me I wasn't ramping up fast enough. He knew exactly why and
    said the team has my back. That was a turning point. I changed my approach completely. I started reaching
    out to my senior manager, having real conversations about how the product worked. Those conversations
    surfaced things I hadn't even discovered on my own.
    Result: My ramp up accelerated immediately. I learned that the fastest way into a new domain is
    combining your own exploration with learning from the people who built it. I still try things myself first,
    but now I set a mental limit. If I'm stuck for 20-30 minutes, I reach out.

GM power phrases: "I adapted my learning approach based on feedback," "I learned to balance independence
with leveraging the team"




Q6: "Tell me about a time you considered the user/customer in your work"
GM signals: Think Customer / Customer Focus

Use Story I — Coding Community Events

    Situation: As Programming Head of our college's coding community, I was responsible for organizing
    technical events.
    Task: Instead of just picking topics we thought were interesting, I wanted to understand what students
    actually needed.
    Action: I spent time talking to junior students about where they were struggling. Turns out they weren't
    stuck on concepts. They were stuck on practical things. How to start competitive programming, how to turn
    their thinking into actual code, even how to build a professional LinkedIn profile. We designed our entire
    event calendar around their needs. Every session came from listening first.
    Result: Attendance grew because students felt the events were relevant to them, not generic tech talks. It
    taught me that the best way to serve your users is to ask what they need first, not assume you already know.

GM power phrase: "I considered the customer's needs before designing the solution"




BACKUP STORIES
 Question                                  Story

 "Time your actions were resisted or       F — SSO Access (held firm on JIRA process despite pushback)
 blocked"

 "Time you planned ahead"                  J — Distributed Systems Teammate (planned architecture early despite
                                           partner wanting to wing it)

 "Time you worked with someone different   J — Distributed Systems Teammate (adapted to different working style)
 from you"

 "Time you led something"                  H — Coding Community Contest (organized regional event, 60-70
                                           participants)

 "Time you delivered under pressure"       B — Testing Disagreement (100% functionality, 98% coverage, before
                                           deadline)




WHY GM (if asked)
    Three things. First, the impact. GM is building the future of transportation. The Data Labeling team creates
    the ground truth that teaches self driving cars to see the world. That's mission critical work where quality
    directly affects safety on the road. I want my work to matter at that level.
    Second, the tech breadth. The team works across TypeScript, React, Python, Golang, ML pipelines, and
    workflow orchestration. That's not a narrow intern role. That's real engineering across the full stack.
    Third, the culture. GM talks about combining startup agility with enterprise scale. Having worked at a
    smaller company and now being in grad school, I've experienced both sides. I'm excited about an
    environment that brings them together.




WHY AUTONOMOUS DRIVING / DATA LABELING (if asked)
    The labeling team is where software engineering meets ML in the most tangible way. You're not building a
    consumer app. You're building tools and pipelines that create training data for autonomous vehicles. The
    quality of every label affects model performance, which affects safety on the road. I like that the work has
    real stakes.
    Also, it's a production system used by thousands of labelers and dozens of ML teams. Building reliable
    tools at that scale while maintaining quality is exactly the kind of engineering challenge I want to work on.




QUESTIONS FOR THE INTERVIEWER (pick 2-3)
  1. "What does a typical intern project look like on the Data Labeling team?"
  2. "What does success look like for an intern at the end of 12 weeks?"
  3. "What's the most interesting challenge the team is working on right now?"
  4. "How does the labeling team interface with the ML teams that consume the labeled data?"
  5. "Where is the team on the spectrum from manual labeling to model assisted and semi automatic
      labeling?"


Questions 4 and 5 show you understand the labeling ecosystem deeply. Use them if the conversation allows.




GM POWER PHRASES TO WEAVE IN NATURALLY
      "I validated rather than assumed" (Seek Truth)
      "I raised the concern early and proposed options" (Be Bold)
      "I owned the outcome and drove the fix through verification" (It's On Me)
      "I optimized for quality and safety first, then throughput" (Win with Integrity)
      "I considered the customer's needs before designing" (Think Customer)
      "I adapted my approach based on feedback" (Practices Self Development)


Don't force these. Just weave them in where they naturally fit.




GM vs AMAZON vs MATHWORKS — KEY DIFFERENCES
                   MathWorks              Amazon                          GM

 Top priority      Culture fit,           Individual ownership, LP        Safety, quality, collaboration
                   communication          alignment
                   MathWorks                Amazon                           GM

Say "I" vs         Balance both             Always "I"                       "I" for your actions but show team
"we"                                                                         awareness

Tone               Conversational, warm     Direct, data driven              Safety conscious, integrity first

Unique angle       "Why EDG specifically"   "Which LP does this map to"      "How does this connect to
                                                                             quality/safety"

Key phrase         "Continuous learning"    "I owned it end to end"          "I validated rather than assumed"




REMINDERS
       30 minutes only. 3-4 questions max. Keep answers to 90-120 seconds.
       Safety is the lens. If you can connect any answer to quality, reliability, or verification, do it.
       "Seek Truth" matters here. GM is an engineering company that builds physical products. They care
       that you pursue facts and challenge assumptions.
       Show collaboration. "One Team" is big at GM. Your stories should show you work well with others.
       Project deep dives possible. Even in a behavioral round, be ready to explain technical decisions in your
       projects.
       STAR + Safety + Learning. After every Result, add what you learned and what you changed. GM values
       self development.
       Thank you note within 24 hours. GM's own toolkit recommends it.
