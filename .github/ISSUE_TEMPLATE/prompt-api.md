---
name: Prompt API
description: Report an issue about the Prompt API in Microsoft Edge
about: new issue
title: "[Prompt API] <TITLE HERE>"
labels: Prompt API
assignees: sohchatt
body:
- type: markdown
  attributes:
    value: |
      Thank you for reporting an issue with the Prompt API in Microsoft Edge!

      If you want to send feedback, questions, or discuss about your scenario for built-in AI instead, please add a comment to issue #1012.

      Before reporting an issue, please check the [Prompt API documentation](https://aka.ms/edge-prompt-api-docs), which includes instructions about how to enable the API in Microsoft Edge.
- type: dropdown
  attributes:
    label: Device performance class
    description: In Edge Canary, go to edge://on-device-internals/ and find the Device performance value under Tools.
    options:
      - Very high
      - High
      - Medium
      - Low
      - Very low
  validations:
    required: true
- type: dropdown
  attributes:
    label: Is device capable
    description: In Edge Canary, go to edge://on-device-internals/ and find the Device capable value under Model Status.
    options:
      - True
      - False
  validations:
    required: true
---
