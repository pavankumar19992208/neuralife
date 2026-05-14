# NeuraLife ML — apps/ml Context

> Adds ML-specific rules on top of root CLAUDE.md.

---

## This Package

**Purpose:** ML Microservice — nightly AI pipelines for mastery calibration, insight generation, recommendations, pattern detection, and model retraining.
**Runtime:** Python 3.11 | **Framework:** FastAPI | **AI:** AWS Bedrock (boto3)
**Called by:** API Gateway (Node.js) via internal HTTP with API key auth

---

## Package Structure

```
apps/ml/
├── main.py                    ← FastAPI app + scheduler registration
├── pipelines/
│   ├── calibration.py         Mastery percentile scoring (nightly 1 AM IST)
│   ├── insights.py            Claude/Bedrock insight generation (nightly 4 AM IST)
│   ├── recommendations.py     Content recommendation (nightly 2 AM IST)
│   ├── patterns.py            Curriculum gap detection (Sunday 3 AM IST)
│   └── training.py            HWR model retraining trigger (monthly)
├── models/
│   ├── mastery.py             Percentile computation
│   └── content.py             Recommendation scoring
├── lib/
│   ├── supabase.py            Supabase Python client (service role — cross-school access)
│   ├── bedrock.py             AWS Bedrock client wrapper (Claude API)
│   ├── config.py              Pydantic settings (fails fast on missing vars)
│   └── logger.py              Structured logging with correlation IDs
├── jobs/
│   └── scheduler.py           APScheduler cron definitions (IST timezone)
└── tests/
    ├── test_calibration.py
    ├── test_insights.py
    └── test_recommendations.py
```

---

## Python Standards

```python
# Type hints on every function — no exceptions
from typing import Literal, Optional
from pydantic import BaseModel

def calibrate_student(
    neura_id: str,
    subject: str,
    raw_score: float,
    class_year: int,
    board: Literal['SCERT_AP', 'SCERT_TS', 'CBSE'],
    correlation_id: str,
) -> 'CalibratedScore':
    ...

# Pydantic for all inputs/outputs
class CalibratedScore(BaseModel):
    neura_id: str
    subject: str
    calibrated_percentile: int
    classification: Literal['MASTERED', 'GOOD', 'DEVELOPING', 'AT_RISK']
    vs_class_avg: float
    population_sample_size: int

# Structured logging — never print()
from lib.logger import get_logger
logger = get_logger(__name__)

logger.info('Calibration started', extra={
    'correlation_id': correlation_id,
    'neura_id': neura_id,
    'subject': subject
})
```

---

## AWS Bedrock — Claude Integration

```python
# lib/bedrock.py
import boto3
import json
from lib.config import settings
from lib.logger import get_logger

logger = get_logger(__name__)

_client = boto3.client(
    service_name='bedrock-runtime',
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
)

async def generate_insight(
    prompt: str,
    max_tokens: int = 400,
    correlation_id: str = '',
) -> str:
    logger.info('Bedrock request', extra={
        'correlation_id': correlation_id,
        'model': settings.BEDROCK_MODEL_ID,
        'prompt_length': len(prompt)
    })

    body = json.dumps({
        'anthropic_version': 'bedrock-2023-05-31',
        'max_tokens': max_tokens,
        'messages': [{'role': 'user', 'content': prompt}],
    })

    try:
        response = _client.invoke_model(
            modelId=settings.BEDROCK_MODEL_ID,
            contentType='application/json',
            accept='application/json',
            body=body,
        )
        result = json.loads(response['body'].read())

        logger.info('Bedrock response', extra={
            'correlation_id': correlation_id,
            'input_tokens': result['usage']['input_tokens'],
            'output_tokens': result['usage']['output_tokens'],
        })

        return result['content'][0]['text']

    except Exception as e:
        logger.error('Bedrock failed', extra={'correlation_id': correlation_id, 'error': str(e)})
        raise
```

---

## Supabase — Python Client

```python
# lib/supabase.py
from supabase import create_client, Client
from lib.config import settings

# ML service always uses service role (cross-school access needed)
_supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY
)

def get_supabase() -> Client:
    return _supabase

# Query rules — same as Node.js
# 1. Always explicit column selection
# 2. Always log queries with correlation_id
# 3. Always handle errors — never assume success

response = _supabase.table('mastery_snapshots') \
    .select('neura_id, subject, topic, raw_score, snapshot_date') \
    .eq('school_id', school_id) \
    .gte('snapshot_date', start_date) \
    .execute()

if response.data is None:
    raise DatabaseError(f'Failed to fetch mastery data for school {school_id}')
```

---

## Pipeline Structure (every pipeline follows this)

```python
# pipelines/calibration.py
from fastapi import APIRouter
from lib.supabase import get_supabase
from lib.logger import get_logger
from models.mastery import compute_percentile
import uuid

router = APIRouter(prefix='/calibration', tags=['calibration'])
logger = get_logger(__name__)

@router.post('/run')
async def run_calibration(request: CalibrationRequest) -> CalibrationResult:
    correlation_id = str(uuid.uuid4())
    supabase = get_supabase()

    logger.info('Pipeline started', extra={
        'correlation_id': correlation_id,
        'student_count': len(request.neura_ids),
        'pipeline': 'calibration'
    })

    results, errors = [], []

    for neura_id in request.neura_ids:
        try:
            result = await _calibrate_one(neura_id, supabase, correlation_id)
            results.append(result)
        except Exception as e:
            logger.error('Calibration failed for student', extra={
                'correlation_id': correlation_id,
                'neura_id': neura_id,
                'error': str(e)
            })
            errors.append({'neura_id': neura_id, 'error': str(e)})
            # Continue with next student — never abort the whole batch

    logger.info('Pipeline complete', extra={
        'correlation_id': correlation_id,
        'success': len(results),
        'errors': len(errors)
    })

    return CalibrationResult(
        calibrated=len(results),
        errors=errors,
        correlation_id=correlation_id,
    )
```

---

## Nightly Schedule (IST — all times India Standard Time)

```python
# jobs/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler(timezone='Asia/Kolkata')

# These run every night in this exact order (important — calibration before insights)
scheduler.add_job(run_session_aggregator,   'cron', hour=0,  minute=0)   # 12:00 AM
scheduler.add_job(run_decay_calculator,     'cron', hour=0,  minute=30)  # 12:30 AM
scheduler.add_job(run_calibration,          'cron', hour=1,  minute=0)   # 1:00 AM
scheduler.add_job(run_recommendations,      'cron', hour=2,  minute=0)   # 2:00 AM
scheduler.add_job(run_insight_generation,   'cron', hour=4,  minute=0)   # 4:00 AM
scheduler.add_job(run_teacher_insights,     'cron', hour=4,  minute=30,  day_of_week='mon')
scheduler.add_job(push_insights_to_parents, 'cron', hour=20, minute=0)   # 8:00 PM push
scheduler.add_job(run_curriculum_patterns,  'cron', hour=3,  minute=0,   day_of_week='sun')
```

---

## Insight Prompt Engineering

```python
# pipelines/insights.py
def build_insight_prompt(
    student_data: dict,
    language: Literal['ENGLISH', 'TELUGU'],
    correlation_id: str,
) -> str:
    name = student_data['full_name']
    class_year = student_data['class_year']
    insights = student_data['mastery_by_subject']
    attendance = student_data['attendance_pct']
    homework = student_data['homework_completion_pct']

    telugu_instruction = (
        "Respond entirely in Telugu (తెలుగు). Use simple, everyday Telugu that any parent can understand."
        if language == 'TELUGU' else
        "Respond in clear, simple English."
    )

    return f"""You are NeuraLife, an AI that helps parents understand their child's learning progress.

{telugu_instruction}

Student: {name}, Class {class_year}

Today's learning data:
{_format_mastery_data(insights)}

Attendance this month: {attendance}%
Homework completion: {homework}%

Write a parent insight (max 3 sentences, max 80 words) that:
1. Mentions one specific thing the student did well today
2. Mentions one specific area to watch (if any)
3. Ends with ONE practical question the parent can ask the child tonight

Do not use jargon. Write as if talking to the parent directly.
Do not start with 'Dear Parent' or any greeting.
Do not mention NeuraLife by name.
"""
```

---

## Error Handling and Cost Control

```python
# Cost tracking — log every Bedrock call
# Bedrock Claude Sonnet: $3/million input tokens, $15/million output tokens
# Log input_tokens + output_tokens per call → monitor monthly spend

# Skip insight if insufficient data (< 5 sessions in last 14 days)
if student_data['session_count_14d'] < 5:
    logger.info('Skipping insight — insufficient data', extra={
        'neura_id': neura_id,
        'sessions': student_data['session_count_14d']
    })
    return InsightResult(status='SKIPPED', reason='INSUFFICIENT_DATA')

# Timeout: 10 seconds per Bedrock call — skip and log if exceeded
# Never let one student's slow API call block the batch
```
