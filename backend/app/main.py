from fastapi import FastAPI
import numpy as np

app = FastAPI(title="FlowTrainer API")


@app.get("/")
def root():
    return {"message": "FlowTrainer API is running"}


@app.get("/sample")
def sample():
    np.random.seed(42)

    lymphocytes = np.random.multivariate_normal(
        [35000, 12000],
        [[4000000, 500000],
         [500000, 2500000]],
        5000
    )

    events = [
        {
            "fsc": float(x),
            "ssc": float(y)
        }
        for x, y in lymphocytes
    ]

    return {
        "sampleId": "demo",
        "events": events
    }
