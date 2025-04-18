---
name: Prompt API
description: Report an issue with the Prompt API in Microsoft Edge
about: new issue
title: "[Prompt API] <TITLE HERE>"
labels: Prompt API
assignees: sohchatt
body:
- type: markdown
  attributes:
    value: |
      Thanks for reporting an problem with the Prompt API!

      If you want to send feedback, questions, or discuss about your scenario instead, please add a comment at https://aka.ms/edge-prompt-api-feedback.

      Before reporting an issue, please check the Prompt API documentation, which includes instructions about how to enable the API in Microsoft Edge. You can find the documentation here: https://aka.ms/edge-prompt-api-docs.
- type: textarea
  attributes:
    label: System
    description: Which OS / processor / system type are you testing on? For Windows, you can fine this information at Windows: Settings > About > Device specifications > System info. For Mac, see Apple > About this mac.
  validations:
    required: true
- type: textarea
  attributes:
    label: GL renderer
    description: What is your device's GL_RENDERER info? In Edge Canary, go to edge://gpu and copy the value for "GL_RENDERER".
  validations:
    required: true
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

