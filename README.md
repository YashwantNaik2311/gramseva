Demo Video: https://youtu.be/V7ziOICXTt8?si=OKbzsHMLMBuCsYKM

Working Demo Link: https://main.dyfgl39sgqbl4.amplifyapp.com/

AWS Build Center Blog: https://builder.aws.com/content/3JXeImbEGwPXggGJhNNhDZUXoCh/we-built-gramseva-in-four-days-it-almost-broke-us

This project was built for the BharatBuilds Hackathon organized by WeMakeDevs x AWS.
This project follows the "Ship It" track.

**1. What is GramSeva?**

GramSeva is a multilingual government-scheme discovery assistant that helps people find potentially relevant Indian government schemes based on their situation.

Instead of asking users to understand complicated eligibility rules, search through government portals, or know the name of a scheme beforehand, GramSeva lets them simply speak or type about themselves.

For example:

“I am 45 years old, I live in Karnataka, and I am a small farmer. What government schemes might be available to me?”

GramSeva understands the information provided, shows the user what it understood, and then matches that profile against a curated dataset of government schemes.

It currently supports English, Hindi, and Kannada

**2. The Problem**

India has a large number of government welfare, financial, educational, agricultural, healthcare, and social-security schemes.

The problem isn't necessarily that these schemes don't exist.

The problem is discoverability

A person may know that government assistance exists, but not know:

which schemes are relevant to them,
what information matters for eligibility,
what the scheme actually provides,
or where they should go to verify and apply.

This becomes even harder when information is presented through formal government portals and documents that aren't designed around a person's individual situation

We wanted to approach the problem from the opposite direction:

Don't make people learn how government schemes are organized. Let them describe their situation naturally.
**
3. Our Approach**

GramSeva turns an unstructured description into a structured profile.

For example:

User says:

“I'm 24, I live in Karnataka, I've finished my degree and I'm currently looking for a job.”

GramSeva understands:

Age → 24
State → Karnataka
Education → Graduate
Occupation → Unemployed

The user gets a chance to review what GramSeva understood before recommendations are generated

The recommendation engine then compares the available information against the eligibility conditions of the schemes in its dataset.

An important design decision

The AI does not decide whether someone is officially eligible.

The language model is used to understand the user's description and extract structured information.

The actual scheme matching is deterministic.

If an important piece of information is missing, GramSeva treats it as unknown, rather than assuming the answer.

The result is presented as a starting point for discovery and verification, not as an official government approval.

Each scheme also provides its source and verification information so that users can continue to the official source.

**4. Multilingual by Design**

GramSeva currently supports:

English · हिन्दी · ಕನ್ನಡ

Users can describe their situation in their preferred language rather than having to translate their circumstances into English or learn government terminology.

Voice input is also supported through Amazon Transcribe, allowing users to speak their situation instead of typing it.

The application can also generate spoken responses where a supported voice is available.

**5. How We Built It**

The application is a serverless web application.

Frontend
React
TypeScript
Vite
Custom responsive UI
AWS Amplify Hosting
Backend
Amazon API Gateway
AWS Lambda
Amazon DynamoDB
Amazon S3
Amazon Transcribe
Amazon Polly
Amazon Bedrock / Bedrock Mantle
Amazon CloudWatch

The frontend communicates with the backend through API Gateway.

Lambda functions handle:

profile extraction,
deterministic recommendation matching,
scheme retrieval,
voice processing,
and health checks.

DynamoDB stores the scheme dataset, while S3 is used for transient voice-processing files.

**6. Why AWS?**

AWS wasn't added simply to satisfy the hackathon requirement.

The architecture naturally fits a serverless application like GramSeva.

API Gateway + Lambda gives us a lightweight backend without managing servers.

DynamoDB provides a simple scalable store for the scheme dataset.

Amazon Bedrock handles the language-understanding part of the application.

Amazon Transcribe allows spoken input.

Amazon Polly provides speech synthesis for supported languages.

Amazon S3 handles temporary audio storage.

Amplify Hosting serves the production frontend.

This gives GramSeva a real deployed architecture rather than a locally running prototype.

**7. What We Learned**

The biggest learning wasn't simply how to call an AI model.

It was learning where AI should and shouldn't be trusted.

We initially approached the problem as if an LLM could simply read a person's situation and recommend schemes.

During development, we realized that this would make the system difficult to trust and reproduce.

So we separated the responsibilities:

AI → understand the person.

Rules → determine which scheme conditions match.

Official sources → provide the final authority.

Building and deploying the entire system also meant learning AWS services that we had not previously worked with, including Lambda, API Gateway, DynamoDB, S3, Transcribe, Polly, Bedrock, and Amplify.

**8. Current Scope**

GramSeva currently contains a curated dataset of 18 government schemes, covering areas including:

agriculture,
insurance,
entrepreneurship,
education,
healthcare,
pensions,
women's support,
and Karnataka-specific schemes.

The application is intentionally focused rather than attempting to represent every government scheme in India.

The goal for this hackathon was to build a working, trustworthy foundation rather than a huge directory with unreliable matching.

**9. What's Next?**

If we continue developing GramSeva, we'd focus on:

expanding and continuously verifying the scheme dataset,
adding more Indian languages,
improving voice accessibility,
making official application pathways easier to navigate,
and improving how users verify uncertain eligibility conditions.

The long-term goal is simple:

Government schemes should be easier to discover because people shouldn't need to understand the system before the system can help them.

**10. AI Tools Used**

AI tools used: Antigravity, Gemini, Claude, GPT-based coding/reasoning tools, and OpenCode/Cline were used during development for code generation, debugging, architecture exploration, testing, documentation, and iteration. All generated code and architectural decisions were reviewed, tested, and integrated as part of the project.
