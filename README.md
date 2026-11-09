<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/header-dark.svg">
  <img alt="Badrish M Srinivasan · AI Engineer building LLM, RAG and agentic systems" src="assets/header-light.svg" width="100%">
</picture>

<p align="center">
  <a href="https://www.linkedin.com/in/badrishms"><img src="https://img.shields.io/badge/LinkedIn-badrishms-0A66C2?style=for-the-badge" alt="LinkedIn: badrishms"></a>
  <a href="https://meldify.130-61-142-164.sslip.io"><img src="https://img.shields.io/badge/Live_demo-Meldify-0D9488?style=for-the-badge" alt="Meldify live demo"></a>
  <img src="https://img.shields.io/badge/Open_to-AI_Engineer_roles_in_Germany-7C3AED?style=for-the-badge" alt="Open to AI Engineer roles in Germany">
</p>

## About me

I build LLM applications that have to be right, not just fluent: retrieval that cites its sources, agents that ask before they act, and evaluations that measure how often the answer is correct. I spent two years in test automation before moving into AI, so my main projects ship with CI and a test suite.

- 🔭 **Now:** building [Maintenance Copilot](https://github.com/baddy1411/maintenance-copilot), cited Q&A and an approval-gated agent over live FAA maintenance data
- 🎓 **M.Sc. Computer Science, Data Engineering**, Constructor University Bremen (grade 1.72). Thesis: quantum vs classical reservoir computing for chaotic time-series forecasting
- 💼 **Before:** RAG engineering at Oakter (New Delhi) and test automation at Capgemini (Pune)
- 📜 AWS Certified Data Engineer – Associate · DataCamp AI Engineer Associate
- 🗣️ English (C1) · German (B1, learning)

## Results I can point to

<table>
  <tr>
    <td align="center" valign="top" width="50%"><h3>76% → 82%</h3>retrieval hit rate after adding reranking to an Azure OpenAI RAG assistant</td>
    <td align="center" valign="top" width="50%"><h3>~10s → 6s</h3>response time on the same assistant, traced with OpenTelemetry and Grafana</td>
  </tr>
  <tr>
    <td align="center" valign="top" width="50%"><h3>~50%</h3>lower error forecasting hot-metal silicon from 188,700 rows of sensor data (SMS group project)</td>
    <td align="center" valign="top" width="50%"><h3>213 / 214</h3>thesis comparisons where a classical model beat the quantum one</td>
  </tr>
</table>

## Featured projects

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🛠️ <a href="https://github.com/baddy1411/maintenance-copilot">Maintenance Copilot</a></h3>
      Cited Q&amp;A and an approval-gated troubleshooting agent over FAA Airworthiness Directives, Service Difficulty Reports and AMT handbooks. Work in progress, documented phase by phase.<br><br>
      <code>LangGraph</code> <code>Postgres + pgvector</code> <code>FastAPI</code> <code>RAG</code> <code>Python</code>
    </td>
    <td width="50%" valign="top">
      <h3>🧹 <a href="https://meldify.130-61-142-164.sslip.io">Meldify</a> <sup>live</sup></h3>
      AI data-cleaning platform that matches CRM and billing records, shows where each field mapping came from, and previews every change before applying it. Ships an MCP server so coding agents can use its tools.<br><br>
      <code>React</code> <code>TypeScript</code> <code>FastAPI</code> <code>PostgreSQL</code> <code>MCP</code>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🌀 <a href="https://github.com/baddy1411/qde-benchmark">Quantum vs Classical Reservoir Computing</a></h3>
      My M.Sc. thesis artifact. Classical models won all 26 matched comparisons on chaotic time series. 131 tests, 8 fault-injection gates, and <code>make verify</code> reproduces the checks in about two minutes.<br><br>
      <code>Python</code> <code>Time series</code> <code>Reproducibility</code> <code>Docker</code>
    </td>
    <td width="50%" valign="top">
      <h3>🏭 <a href="https://github.com/baddy1411/sensorops">SensorOps</a></h3>
      Predictive maintenance with three benchmarked anomaly detectors, a RAG copilot that writes incident reports, and a hash-chained audit log for every prediction. 93 tests.<br><br>
      <code>PyTorch</code> <code>Dagster</code> <code>MLflow</code> <code>ChromaDB</code> <code>FastAPI</code>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📚 <a href="https://github.com/baddy1411/compliance-assistant">Compliance Assistant</a></h3>
      RAG over regulatory documents (GDPR, EU AI Act) that answers with citations and says "I don't know" when the documents don't cover the question. Includes evals and a LoRA fine-tuning path.<br><br>
      <code>RAG</code> <code>ChromaDB</code> <code>sentence-transformers</code> <code>LoRA</code> <code>FastAPI</code>
    </td>
    <td width="50%" valign="top">
      <h3>🧊 <a href="https://github.com/baddy1411/real-time-medallion-lakehouse">Real-Time Medallion Lakehouse</a></h3>
      Streaming platform from raw events to a star schema: Kafka into Spark Structured Streaming, Iceberg tables with a quarantine for bad rows, Polars microbatches, and dbt + DuckDB for the gold layer, all on Kubernetes.<br><br>
      <code>Kafka</code> <code>Spark</code> <code>Iceberg</code> <code>Polars</code> <code>dbt</code> <code>Kubernetes</code>
    </td>
  </tr>
</table>

<sub>More data engineering: <a href="https://github.com/baddy1411/nyc-taxi-lakehouse">nyc-taxi-lakehouse</a> · <a href="https://github.com/baddy1411/carbon-intelligence-platform">carbon-intelligence-platform</a></sub>

## Tech stack

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://skillicons.dev/icons?i=py%2Cc%2Ccpp%2Cbash%2Cts%2Creact%2Cfastapi%2Cpytorch%2Ctensorflow%2Csklearn&theme=dark">
    <img alt="Python, C, C++, Bash, TypeScript, React, FastAPI, PyTorch, TensorFlow, scikit-learn" src="https://skillicons.dev/icons?i=py,c,cpp,bash,ts,react,fastapi,pytorch,tensorflow,sklearn&theme=light">
  </picture>
  <br>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://skillicons.dev/icons?i=postgres%2Cmysql%2Cmongodb%2Credis%2Ckafka%2Caws%2Cazure%2Cdocker%2Ckubernetes%2Cgithubactions%2Cgrafana%2Cprometheus&theme=dark">
    <img alt="PostgreSQL, MySQL, MongoDB, Redis, Kafka, AWS, Azure, Docker, Kubernetes, GitHub Actions, Grafana, Prometheus" src="https://skillicons.dev/icons?i=postgres,mysql,mongodb,redis,kafka,aws,azure,docker,kubernetes,githubactions,grafana,prometheus&theme=light">
  </picture>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/LangGraph-1C3C3C?style=flat-square&logo=langgraph&logoColor=white" alt="LangGraph">
  <img src="https://img.shields.io/badge/LangChain-1C3C3C?style=flat-square&logo=langchain&logoColor=white" alt="LangChain">
  <img src="https://img.shields.io/badge/Hugging_Face-FFD21E?style=flat-square&logo=huggingface&logoColor=black" alt="Hugging Face">
  <img src="https://img.shields.io/badge/Anthropic-191919?style=flat-square&logo=anthropic&logoColor=white" alt="Anthropic">
  <img src="https://img.shields.io/badge/Azure_OpenAI-0078D4?style=flat-square" alt="Azure OpenAI">
  <img src="https://img.shields.io/badge/pgvector-336791?style=flat-square" alt="pgvector">
  <img src="https://img.shields.io/badge/MLflow-0194E2?style=flat-square&logo=mlflow&logoColor=white" alt="MLflow">
  <img src="https://img.shields.io/badge/Optuna-2C5BB4?style=flat-square&logo=optuna&logoColor=white" alt="Optuna">
  <img src="https://img.shields.io/badge/Pydantic-E92063?style=flat-square&logo=pydantic&logoColor=white" alt="Pydantic">
  <img src="https://img.shields.io/badge/PySpark-E25A1C?style=flat-square&logo=apachespark&logoColor=white" alt="PySpark">
  <img src="https://img.shields.io/badge/Airflow-017CEE?style=flat-square&logo=apacheairflow&logoColor=white" alt="Airflow">
  <img src="https://img.shields.io/badge/Polars-CD792C?style=flat-square&logo=polars&logoColor=white" alt="Polars">
  <img src="https://img.shields.io/badge/DuckDB-FFF000?style=flat-square&logo=duckdb&logoColor=black" alt="DuckDB">
</p>

<p align="center"><sub>Based in Bremen, Germany · open to conversations about AI engineering roles</sub></p>
