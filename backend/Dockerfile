FROM tiangolo/uvicorn-gunicorn-fastapi:python3.11-slim
ENV PYTHONUNBUFFERED=1
ENV PIP_DEFAULT_TIMEOUT=100
WORKDIR /code

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependency metadata
COPY app/pyproject.toml app/uv.lock /code/

# Use the project venv created by uv sync
ENV VIRTUAL_ENV=/code/.venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Allow installing dev dependencies to run tests
ARG INSTALL_DEV=false
RUN bash -c "if [ \"$INSTALL_DEV\" = 'true' ] ; then uv sync --frozen --extra dev --no-install-project ; else uv sync --frozen --no-install-project ; fi"
RUN uv pip install gunicorn

ENV PYTHONPATH=/code/app
ENV APP_MODULE=app.main:app
ENV PORT=8080
COPY app /code/app
EXPOSE 8000
