from tasks import app

"""
--- For data scientist ---

1- Read DOC.md
2- Use either Redis cache or Postgres database values (depends on what scale you want to calculate,
    see DOC.md how to use/access the services) to calculate the prices.
3- Store the calculated data into "market_candles" (open, close...) via SQLAlchemy (take db_client.py as example and see in models.py for reference)

"""

# Mandatory: use the decorator @app.task to use Celery, otherwise very slow and the execution will be blocked
@app.task
def function_to_calculate():
    """Write your function to calculate prices"""
    pass