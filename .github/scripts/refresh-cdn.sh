#!/usr/bin/env bash
# Copyright 2026 MrTanXin.
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

origin=${APP_URL%/}
domain=${origin#https://}
urls=$(printf '%s\n' "$origin/" "$origin/editor")

# Keep content-hashed assets cached. Existing browser tabs may still need them.
response=$(aliyun cdn RefreshObjectCaches --ObjectPath "$urls" --ObjectType File)
task_ids=$(jq -er '.RefreshTaskId | select(type == "string" and test("^[0-9]+(,[0-9]+)*$"))' <<< "$response")
IFS=, read -r -a tasks <<< "$task_ids"
echo "阿里云 CDN 已接受刷新任务：$task_ids"

deadline=$((SECONDS + 420))
for task in "${tasks[@]}"; do
  while true; do
    response=$(aliyun cdn DescribeRefreshTasks --TaskId "$task" --DomainName "$domain" --ObjectType file)
    statuses=$(jq -c '[.Tasks.CDNTask[]?.Status]' <<< "$response")
    if jq -e 'any(.[]; . == "Failed" or . == "Canceled" or . == "Timeout")' >/dev/null <<< "$statuses"; then
      echo "::error::阿里云 CDN 刷新任务 $task 失败，状态：$statuses"
      exit 1
    fi
    if jq -e 'length > 0 and all(.[]; . == "Complete")' >/dev/null <<< "$statuses"; then
      echo "阿里云 CDN 刷新任务 $task 已完成"
      break
    fi
    if (( SECONDS >= deadline )); then
      echo "::error::等待阿里云 CDN 刷新任务 $task 超时，状态：$statuses"
      exit 1
    fi
    sleep 10
  done
done
