---
id: 'logging-and-recording'
title: 'Logging and recording'
sidebar_label: 'Logging and recording'
custom_edit_url: null
hide_title: true
---

# Logging, recording and code generation

## Logging

One of the key features of Laika is the ability to log all (or select) operations and the data associated with them.

This makes it much easier to create and update mocks. To use, follow these steps:

- Open the webapp in your favorite browser (making sure Laika is enabled -- e.g. using development build of the site).
- Open DevTools and the console
- Run [`laika.log.startLogging()`](api/classes/Laika.LogApi.md#startlogging)

I recommend filtering your console's output to "GQL", as it will remove all the other noise.

You may pass an optional filter to the [`startLogging`](api/classes/Laika.LogApi.md#startlogging) function. See [API documentation](api/classes/Laika.LogApi.md) for details.

![Example logging output](api/media/example-logging.png)

## Recording and code generation

With complex scenarios, copying and pasting long JSONs and extracting variables from them is still a tedious job. That's where recording comes in!

To enable recording, follow the same steps as for enabling logging, then additionally:

- Run `laika.log.startRecording('opening a chat ticket' /* what you are about to do */)`

By describing the first action, it will be included in the recording and generated code,
so you can orient yourself better.

As you record, if there are multiple actions in the story you want to capture,
before each action you take, I highly recommend marking them using the `markAction` function:

- Run `laika.log.markAction('opening the next ticket')`

As you record, you'll notice the red dot indicator 🔴 now appearing next to the logs.

![Example recording output](api/media/example-recording.png)

Once you're ready, stop the recording:

- Run `laika.log.stopRecording()`

To automatically generate fixtures, interceptors and calls in order of your activity:

- Run `laika.log.generateMockCode()`
- Watch the magic happen! 🎩

## I want to know more!

For more advanced usage of logging, recording, code generation, filtering and other options see the [Log API documentation](api/classes/Laika.LogApi.md).
