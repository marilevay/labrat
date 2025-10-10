# LabRat 🐁

## Video Demo

[//]: # (https://youtu.be/wSsUpNZlRFY)

Developed as a solo hack project during the 1st Silicon Valley AI Hub ([SVAI HUb](https://siliconvalleyaihub.com/)) Hackathon hosted by Snowflake, Meta and AWS. (Top 6 projects)

LabRat is a Chrome extension designed to help young research assistants create physics-based simulations from handwritten notes. 

It contains an AI agent that analyzes screenshots from an HTML canvas, as well as uploaded images or files and suggest code entries with additional additional TODO steps for students to complete. 

Code suggestions are then integrated to a [Snowflake notebook environment](https://www.snowflake.com/en/product/features/notebooks/), where students can complete and run their simulations.

The current LabRat version uses Claude Opus 4 as a text and vision model (accessed through AWS Bedrock). Updates to include a lighter vision model are underway!

## How It Works
1. Upload or draw your handwritten notes in the extension interface.
2. LabRat analyzes the content of your whiteboard or pictures of hanwritten notes and suggests code snippets relevant to your data or equations.
3. The LabRat agent provides TODO steps for further customization and learning.
4. You can inject the generated code directly into a Snowflake notebook (Next step: expand to other Jupyter environments).

## How to Use the Extension
1. Clone this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable "Developer mode" using the toggle switch in the top-right corner.
4. Click the "Load unpacked" button.
5. Select the folder where you cloned the repository.
6. The LabRat extension should now appear in your extensions list and be ready to use.

---
