# Audio Encoder for ICECAST server

## supported OS:

- MacOS (intel / apple silicone)
- Linux (x86 / arm)
- Windows

## Configuration

Create config.json in same directory as executable

```
{
  "ffmpegBinaryPath": "ffmpeg.exe",
  "ffmpegCaptureMode": "dshow",
  "encoders": [
    {
      "id": "test-128mp3",
      "bitrate": 128,
      "chanels": 2,
      "samplerate": 44100,
      "format": "mp3",
      "captureAudioCard": ":0",
      "icecast": {
        "mount": "aaa.mp3",
        "username": "source",
        "password": "password",
        "server": "icecast.play.cz:8000"
      }
    },
  ]
}
```

| property          | type                      | description                                                   |
| ----------------- | ------------------------- | ------------------------------------------------------------- |
| ffmpegBinaryPath  | string                    | Path to ffmpeg binary you want to use                         |
| ffmpegCaptureMode | dshow, avfoundation, alsa | dshow - Windows <br/> avfoundation - MacOS <br/> alsa - Linux |
| encoders          | Object[]                  | Array of individual encoders config                           |

### Encoder settings

| property          | type           | description                                                                                      | example                                                                                             |
| ----------------- | -------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| id                | string         | Inique ID                                                                                        | test-stream                                                                                         |
| bitrate           | int            | Bitrate in kb                                                                                    | 128                                                                                                 |
| channels          | int            | Number of audio channels (1 = mono / 2 = stereo )                                                | 2                                                                                                   |
| samplerate        | int            | Audio sample rate in Hz                                                                          | 44100                                                                                               |
| format            | mp3, aac, aac+ | Audio format. Please note, that aac+ requires custom ffmpeg build with libfdk_aac build into it. | mp3                                                                                                 |
| captureAudioCard  | string         | Audio cart ID for ffmpeg <br/> \* see later in this docs                                         | `":0"` for MacOS <br/> `"audio=\"Your Audio Device Name\""` for Windows <br/> `"default"` for Linux |
| icecast->mount    | string         | Icecast mountpoint name                                                                          | test.mp3                                                                                            |
| icecast->username | string         | Username for this mountpoint (if you do not know, the `source` is default)                       | source                                                                                              |
| icecast->password | string         | Password for this mountpoint                                                                     | password                                                                                            |
| icecast->server   | string         | Icecast server with optional port                                                                | icecast-server.example.com:8080                                                                     |

## captureAudioCard & ffmpegCaptureMode

Identifing soundcard input is not so easy, but if you follow this guide, it is simple to understand.

First, you need to use correct capture mode for OS:

- `dshow` - Windows
- `avfoundation` - MacOS
- `alsa` - Linux

Then, you need to list your available capture devices using ffmpeg to find ID or name (depending on platform)

**Windows**

```
ffmpeg.exe -f dshow -list_devices true -i dummy
```

**MacOS**

```
ffmpeg -f avfoundation -list_devices true -i dummy
```

**Linux**

```
ffmpeg -f alsa -list_devices true -i dummy
```

Example output:

```
AVFoundation video devices:
[0] FaceTime HD Camera
[1] LadaSoukup Camera
[2] LadaSoukup Desk View Camera
[3] Capture screen 0
[4] Capture screen 1
AVFoundation audio devices:
[0] MacBook Pro Microphone
[1] LadaSoukup Microphone
```

Last step is to configure the audio input

**Windows**
On Windows, you have to use the device name and set it using audio="" syntax.

```
"audio=\"Your Audio Device Name\""
```

**MacOS**
On MacOS, you have to use system index and notation video:audio. We need only audio, so we will skip the video.

```
":0"
```

**Linux**

```
"default"
```
