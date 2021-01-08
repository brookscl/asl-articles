#!/usr/bin/env bash
pipenv run python run_server.py &
cd web
npm start
