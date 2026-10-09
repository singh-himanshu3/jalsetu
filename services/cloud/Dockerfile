FROM public.ecr.aws/lambda/python:3.12@sha256:d0a4fa8f489a7d9f05a95e642ffd599bea3b07339adb510185a8a14653944b1c
ENV OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 NUMEXPR_NUM_THREADS=1 PYTHONUTF8=1
COPY services/planner/requirements-runtime.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
COPY services/planner/jalsetu_planner ${LAMBDA_TASK_ROOT}/jalsetu_planner
COPY services/cloud ${LAMBDA_TASK_ROOT}/cloud
CMD ["cloud.handler.api_handler"]
