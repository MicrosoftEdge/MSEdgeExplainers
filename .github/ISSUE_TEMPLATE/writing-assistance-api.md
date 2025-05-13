---
name: Writing assistance APIs
description: Report an issue about the writing assistance APIs in Microsoft Edge
about: new issue
title: "[Writing assistance APIs] <TITLE HERE>"
labels: Writing assistance APIs
assignees: sohchatt
body:
- type: markdown
  attributes:
    value: |
      Thank you for reporting an issue with the writing assistance APIs in Microsoft Edge!

      If you want to send feedback, questions, or discuss about your scenario for built-in AI instead, please add a comment to issue #1031.

      Before reporting an issue, please check the [Writing assistance APIs documentation](https://aka.ms/edge-writing-assistance-api-docs), which includes instructions about how to enable the APIs in Microsoft Edge.
- type: textarea
  attributes:
    label: System
    description: Which operating system / processor are you testing on? For Windows, you can find this information at Windows: Settings > About > Device specifications > System info. For Mac, see Apple > About this mac.
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
