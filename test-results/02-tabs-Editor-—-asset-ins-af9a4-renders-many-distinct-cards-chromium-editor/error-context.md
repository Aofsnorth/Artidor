# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-tabs.spec.ts >> Editor — asset & inspector tabs >> Transitions panel renders many distinct cards
- Location: tests\02-tabs.spec.ts:153:6

# Error details

```
Error: Transitions panel should expose many distinct cards (>=20)

expect(received).toBeGreaterThan(expected)

Expected: > 20
Received:   0
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - region "Notifications alt+T"
  - generic [ref=e7] [cursor=pointer]:
    - button "Open issues overlay" [ref=e8]:
      - img [ref=e10]
      - generic [ref=e12]:
        - generic [ref=e13]: "5"
        - generic [ref=e14]: "6"
      - generic [ref=e15]:
        - text: Issue
        - generic [ref=e16]: s
    - button "Collapse issues badge" [ref=e17]:
      - img [ref=e18]
  - alert [ref=e20]
  - generic [ref=e23]:
    - banner [ref=e24]:
      - generic [ref=e25]:
        - button "Artidor Logo" [ref=e26] [cursor=pointer]:
          - img "Project thumbnail" [ref=e27]
        - generic [ref=e28]:
          - generic [ref=e29]:
            - link "Projects" [ref=e30] [cursor=pointer]:
              - /url: /projects
            - generic [ref=e31]: /
          - textbox [ref=e32] [cursor=pointer]: Untitled Project
      - button "Fit" [ref=e34]:
        - generic [ref=e35]: Fit
        - img [ref=e36]
      - navigation [ref=e38]:
        - button "Open settings" [ref=e39] [cursor=pointer]:
          - img [ref=e40]
        - button "Invite collaborators" [ref=e43]:
          - img [ref=e44]
          - generic [ref=e48]: Invite
        - button "Export" [ref=e50] [cursor=pointer]:
          - img [ref=e51]
          - generic [ref=e55]: Export
          - img [ref=e56]
    - generic [ref=e59]:
      - generic [ref=e60]:
        - generic [ref=e61]:
          - button "Assets" [ref=e62] [cursor=pointer]:
            - img
            - generic [ref=e63]: Assets
          - button "AI Edit" [disabled] [ref=e64]:
            - img
            - generic [ref=e65]: AI Edit
          - button "Text" [ref=e66] [cursor=pointer]:
            - img
            - generic [ref=e67]: Text
          - button "Elements" [ref=e68] [cursor=pointer]:
            - img
            - generic [ref=e69]: Elements
          - button "Transitions" [active] [ref=e70] [cursor=pointer]:
            - img
            - generic [ref=e71]: Transitions
          - button "Effects" [ref=e72] [cursor=pointer]:
            - img
            - generic [ref=e73]: Effects
          - button "Overlays" [ref=e74] [cursor=pointer]:
            - img
            - generic [ref=e75]: Overlays
          - button "Audio" [ref=e76] [cursor=pointer]:
            - img
            - generic [ref=e77]: Audio
          - button "Motion" [ref=e78] [cursor=pointer]:
            - img
            - generic [ref=e79]: Motion
          - button "Adjust" [ref=e80] [cursor=pointer]:
            - img
            - generic [ref=e81]: Adjust
          - button "Templates" [ref=e82] [cursor=pointer]:
            - img
            - generic [ref=e83]: Templates
          - button "Preset" [ref=e84] [cursor=pointer]:
            - img
            - generic [ref=e85]: Preset
          - button "Tools" [ref=e86] [cursor=pointer]:
            - img
            - generic [ref=e87]: Tools
          - button "Plugins" [ref=e88] [cursor=pointer]:
            - img
            - generic [ref=e89]: Plugins
          - button "Scripting" [ref=e90] [cursor=pointer]:
            - img
            - generic [ref=e91]: Scripting
          - button "Settings" [ref=e92] [cursor=pointer]:
            - img
            - generic [ref=e93]: Settings
        - generic "1 MB used of 3 GB available" [ref=e94]:
          - generic [ref=e95]: 3 GB
          - generic [ref=e96]: Free
      - generic [ref=e101]:
        - generic [ref=e103]:
          - generic [ref=e108]:
            - generic [ref=e110]: Transitions
            - generic [ref=e113]:
              - paragraph [ref=e114]: Add a transition between two adjacent clips. Select two clips on the same track, then choose a transition.
              - generic [ref=e115]:
                - button "All" [ref=e116]
                - button "Fade" [ref=e117]
                - button "Slide" [ref=e118]
                - button "Push" [ref=e119]
                - button "Zoom" [ref=e120]
                - button "Rotate" [ref=e121]
                - button "Wipe" [ref=e122]
                - button "Morph" [ref=e123]
                - button "Glitch" [ref=e124]
                - button "Liquid" [ref=e125]
                - button "Light" [ref=e126]
                - button "3D" [ref=e127]
                - button "Geometric" [ref=e128]
              - generic [ref=e129]:
                - button "Fade Add Fade" [ref=e130] [cursor=pointer]:
                  - generic [ref=e132]: Fade
                  - button "Add Fade" [ref=e134]:
                    - img
                - button "Cross Dissolve Add Cross Dissolve" [ref=e135] [cursor=pointer]:
                  - generic [ref=e137]: Cross Dissolve
                  - button "Add Cross Dissolve" [ref=e139]:
                    - img
                - button "Dip to Black Add Dip to Black" [ref=e140] [cursor=pointer]:
                  - generic [ref=e142]: Dip to Black
                  - button "Add Dip to Black" [ref=e144]:
                    - img
                - button "Wipe Left Add Wipe Left" [ref=e145] [cursor=pointer]:
                  - generic [ref=e147]: Wipe Left
                  - button "Add Wipe Left" [ref=e149]:
                    - img
                - button "Wipe Right Add Wipe Right" [ref=e150] [cursor=pointer]:
                  - generic [ref=e152]: Wipe Right
                  - button "Add Wipe Right" [ref=e154]:
                    - img
                - button "Slide Left Add Slide Left" [ref=e155] [cursor=pointer]:
                  - generic [ref=e157]: Slide Left
                  - button "Add Slide Left" [ref=e159]:
                    - img
                - button "Slide Up Add Slide Up" [ref=e160] [cursor=pointer]:
                  - generic [ref=e162]: Slide Up
                  - button "Add Slide Up" [ref=e164]:
                    - img
                - button "Zoom Add Zoom" [ref=e165] [cursor=pointer]:
                  - generic [ref=e167]: Zoom
                  - button "Add Zoom" [ref=e169]:
                    - img
                - button "Glitch Add Glitch" [ref=e170] [cursor=pointer]:
                  - generic [ref=e172]: Glitch
                  - button "Add Glitch" [ref=e174]:
                    - img
                - button "Wipe Clock Add Wipe Clock" [ref=e175] [cursor=pointer]:
                  - generic [ref=e177]: Wipe Clock
                  - button "Add Wipe Clock" [ref=e179]:
                    - img
                - button "Cube Rotate Add Cube Rotate" [ref=e180] [cursor=pointer]:
                  - generic [ref=e182]: Cube Rotate
                  - button "Add Cube Rotate" [ref=e184]:
                    - img
                - button "Wipe Down Add Wipe Down" [ref=e185] [cursor=pointer]:
                  - generic [ref=e187]: Wipe Down
                  - button "Add Wipe Down" [ref=e189]:
                    - img
                - button "Slide Down Add Slide Down" [ref=e190] [cursor=pointer]:
                  - generic [ref=e192]: Slide Down
                  - button "Add Slide Down" [ref=e194]:
                    - img
                - button "Wipe Up Add Wipe Up" [ref=e195] [cursor=pointer]:
                  - generic [ref=e197]: Wipe Up
                  - button "Add Wipe Up" [ref=e199]:
                    - img
                - button "Slide Right Add Slide Right" [ref=e200] [cursor=pointer]:
                  - generic [ref=e202]: Slide Right
                  - button "Add Slide Right" [ref=e204]:
                    - img
                - button "Circle Wipe Add Circle Wipe" [ref=e205] [cursor=pointer]:
                  - generic [ref=e207]: Circle Wipe
                  - button "Add Circle Wipe" [ref=e209]:
                    - img
                - button "Barn Door Add Barn Door" [ref=e210] [cursor=pointer]:
                  - generic [ref=e212]: Barn Door
                  - button "Add Barn Door" [ref=e214]:
                    - img
                - button "Iris Add Iris" [ref=e215] [cursor=pointer]:
                  - generic [ref=e217]: Iris
                  - button "Add Iris" [ref=e219]:
                    - img
                - button "Vertical Blinds Add Vertical Blinds" [ref=e220] [cursor=pointer]:
                  - generic [ref=e222]: Vertical Blinds
                  - button "Add Vertical Blinds" [ref=e224]:
                    - img
                - button "Page Turn Add Page Turn" [ref=e225] [cursor=pointer]:
                  - generic [ref=e227]: Page Turn
                  - button "Add Page Turn" [ref=e229]:
                    - img
                - button "Fade to Black Add Fade to Black" [ref=e230] [cursor=pointer]:
                  - generic [ref=e232]: Fade to Black
                  - button "Add Fade to Black" [ref=e234]:
                    - img
                - button "Fade to White Add Fade to White" [ref=e235] [cursor=pointer]:
                  - generic [ref=e237]: Fade to White
                  - button "Add Fade to White" [ref=e239]:
                    - img
                - button "Checker Wipe Add Checker Wipe" [ref=e240] [cursor=pointer]:
                  - generic [ref=e242]: Checker Wipe
                  - button "Add Checker Wipe" [ref=e244]:
                    - img
                - button "Flash White Add Flash White" [ref=e245] [cursor=pointer]:
                  - generic [ref=e247]: Flash White
                  - button "Add Flash White" [ref=e249]:
                    - img
                - button "Flip Horizontal Add Flip Horizontal" [ref=e250] [cursor=pointer]:
                  - generic [ref=e252]: Flip Horizontal
                  - button "Add Flip Horizontal" [ref=e254]:
                    - img
                - button "Spin Add Spin" [ref=e255] [cursor=pointer]:
                  - generic [ref=e257]: Spin
                  - button "Add Spin" [ref=e259]:
                    - img
                - button "Mosaic Add Mosaic" [ref=e260] [cursor=pointer]:
                  - generic [ref=e262]: Mosaic
                  - button "Add Mosaic" [ref=e264]:
                    - img
                - button "Paint Splash Add Paint Splash" [ref=e265] [cursor=pointer]:
                  - generic [ref=e267]: Paint Splash
                  - button "Add Paint Splash" [ref=e269]:
                    - img
                - button "Push Zoom Add Push Zoom" [ref=e270] [cursor=pointer]:
                  - generic [ref=e272]: Push Zoom
                  - button "Add Push Zoom" [ref=e274]:
                    - img
                - button "Split Slide Add Split Slide" [ref=e275] [cursor=pointer]:
                  - generic [ref=e277]: Split Slide
                  - button "Add Split Slide" [ref=e279]:
                    - img
                - button "Color Sweep Add Color Sweep" [ref=e280] [cursor=pointer]:
                  - generic [ref=e282]: Color Sweep
                  - button "Add Color Sweep" [ref=e284]:
                    - img
                - button "Chroma Pop Add Chroma Pop" [ref=e285] [cursor=pointer]:
                  - generic [ref=e287]: Chroma Pop
                  - button "Add Chroma Pop" [ref=e289]:
                    - img
                - button "Morph Cut Add Morph Cut" [ref=e290] [cursor=pointer]:
                  - generic [ref=e292]: Morph Cut
                  - button "Add Morph Cut" [ref=e294]:
                    - img
                - button "Whip Pan Add Whip Pan" [ref=e295] [cursor=pointer]:
                  - generic [ref=e297]: Whip Pan
                  - button "Add Whip Pan" [ref=e299]:
                    - img
                - button "Shutter Add Shutter" [ref=e300] [cursor=pointer]:
                  - generic [ref=e302]: Shutter
                  - button "Add Shutter" [ref=e304]:
                    - img
                - button "Light Leak Add Light Leak" [ref=e305] [cursor=pointer]:
                  - generic [ref=e307]: Light Leak
                  - button "Add Light Leak" [ref=e309]:
                    - img
                - button "Rotate Add Rotate" [ref=e310] [cursor=pointer]:
                  - generic [ref=e312]: Rotate
                  - button "Add Rotate" [ref=e314]:
                    - img
                - button "Skew Add Skew" [ref=e315] [cursor=pointer]:
                  - generic [ref=e317]: Skew
                  - button "Add Skew" [ref=e319]:
                    - img
                - button "Diagonal Wipe Add Diagonal Wipe" [ref=e320] [cursor=pointer]:
                  - generic [ref=e322]: Diagonal Wipe
                  - button "Add Diagonal Wipe" [ref=e324]:
                    - img
                - button "Venetian Blinds Add Venetian Blinds" [ref=e325] [cursor=pointer]:
                  - generic [ref=e327]: Venetian Blinds
                  - button "Add Venetian Blinds" [ref=e329]:
                    - img
                - button "RGB Split Add RGB Split" [ref=e330] [cursor=pointer]:
                  - generic [ref=e332]: RGB Split
                  - button "Add RGB Split" [ref=e334]:
                    - img
                - button "Pixelate Add Pixelate" [ref=e335] [cursor=pointer]:
                  - generic [ref=e337]: Pixelate
                  - button "Add Pixelate" [ref=e339]:
                    - img
                - button "Stretch Add Stretch" [ref=e340] [cursor=pointer]:
                  - generic [ref=e342]: Stretch
                  - button "Add Stretch" [ref=e344]:
                    - img
                - button "Zoom Blur Add Zoom Blur" [ref=e345] [cursor=pointer]:
                  - generic [ref=e347]: Zoom Blur
                  - button "Add Zoom Blur" [ref=e349]:
                    - img
                - button "Radial Wipe Add Radial Wipe" [ref=e350] [cursor=pointer]:
                  - generic [ref=e352]: Radial Wipe
                  - button "Add Radial Wipe" [ref=e354]:
                    - img
                - button "Curtain Add Curtain" [ref=e355] [cursor=pointer]:
                  - generic [ref=e357]: Curtain
                  - button "Add Curtain" [ref=e359]:
                    - img
                - button "Bounce Add Bounce" [ref=e360] [cursor=pointer]:
                  - generic [ref=e362]: Bounce
                  - button "Add Bounce" [ref=e364]:
                    - img
                - button "Aperture Add Aperture" [ref=e365] [cursor=pointer]:
                  - generic [ref=e367]: Aperture
                  - button "Add Aperture" [ref=e369]:
                    - img
                - button "Flip Vertical Add Flip Vertical" [ref=e370] [cursor=pointer]:
                  - generic [ref=e372]: Flip Vertical
                  - button "Add Flip Vertical" [ref=e374]:
                    - img
                - button "Noise Fade Add Noise Fade" [ref=e375] [cursor=pointer]:
                  - generic [ref=e377]: Noise Fade
                  - button "Add Noise Fade" [ref=e379]:
                    - img
                - button "Ripple Add Ripple" [ref=e380] [cursor=pointer]:
                  - generic [ref=e382]: Ripple
                  - button "Add Ripple" [ref=e384]:
                    - img
                - button "Kaleidoscope Add Kaleidoscope" [ref=e385] [cursor=pointer]:
                  - generic [ref=e387]: Kaleidoscope
                  - button "Add Kaleidoscope" [ref=e389]:
                    - img
                - button "Transition 1 Add Transition 1" [ref=e390] [cursor=pointer]:
                  - generic [ref=e392]: Transition 1
                  - button "Add Transition 1" [ref=e394]:
                    - img
                - button "Transition 2 Add Transition 2" [ref=e395] [cursor=pointer]:
                  - generic [ref=e397]: Transition 2
                  - button "Add Transition 2" [ref=e399]:
                    - img
                - button "Transition 3 Add Transition 3" [ref=e400] [cursor=pointer]:
                  - generic [ref=e402]: Transition 3
                  - button "Add Transition 3" [ref=e404]:
                    - img
                - button "Transition 4 Add Transition 4" [ref=e405] [cursor=pointer]:
                  - generic [ref=e407]: Transition 4
                  - button "Add Transition 4" [ref=e409]:
                    - img
                - button "Transition 5 Add Transition 5" [ref=e410] [cursor=pointer]:
                  - generic [ref=e412]: Transition 5
                  - button "Add Transition 5" [ref=e414]:
                    - img
                - button "Transition 6 Add Transition 6" [ref=e415] [cursor=pointer]:
                  - generic [ref=e417]: Transition 6
                  - button "Add Transition 6" [ref=e419]:
                    - img
                - button "Transition 7 Add Transition 7" [ref=e420] [cursor=pointer]:
                  - generic [ref=e422]: Transition 7
                  - button "Add Transition 7" [ref=e424]:
                    - img
                - button "Transition 8 Add Transition 8" [ref=e425] [cursor=pointer]:
                  - generic [ref=e427]: Transition 8
                  - button "Add Transition 8" [ref=e429]:
                    - img
                - button "Transition 9 Add Transition 9" [ref=e430] [cursor=pointer]:
                  - generic [ref=e432]: Transition 9
                  - button "Add Transition 9" [ref=e434]:
                    - img
                - button "Transition 10 Add Transition 10" [ref=e435] [cursor=pointer]:
                  - generic [ref=e437]: Transition 10
                  - button "Add Transition 10" [ref=e439]:
                    - img
                - button "Transition 11 Add Transition 11" [ref=e440] [cursor=pointer]:
                  - generic [ref=e442]: Transition 11
                  - button "Add Transition 11" [ref=e444]:
                    - img
                - button "Transition 12 Add Transition 12" [ref=e445] [cursor=pointer]:
                  - generic [ref=e447]: Transition 12
                  - button "Add Transition 12" [ref=e449]:
                    - img
                - button "Transition 13 Add Transition 13" [ref=e450] [cursor=pointer]:
                  - generic [ref=e452]: Transition 13
                  - button "Add Transition 13" [ref=e454]:
                    - img
                - button "Transition 14 Add Transition 14" [ref=e455] [cursor=pointer]:
                  - generic [ref=e457]: Transition 14
                  - button "Add Transition 14" [ref=e459]:
                    - img
                - button "Transition 15 Add Transition 15" [ref=e460] [cursor=pointer]:
                  - generic [ref=e462]: Transition 15
                  - button "Add Transition 15" [ref=e464]:
                    - img
                - button "Transition 16 Add Transition 16" [ref=e465] [cursor=pointer]:
                  - generic [ref=e467]: Transition 16
                  - button "Add Transition 16" [ref=e469]:
                    - img
                - button "Transition 17 Add Transition 17" [ref=e470] [cursor=pointer]:
                  - generic [ref=e472]: Transition 17
                  - button "Add Transition 17" [ref=e474]:
                    - img
                - button "Transition 18 Add Transition 18" [ref=e475] [cursor=pointer]:
                  - generic [ref=e477]: Transition 18
                  - button "Add Transition 18" [ref=e479]:
                    - img
                - button "Transition 19 Add Transition 19" [ref=e480] [cursor=pointer]:
                  - generic [ref=e482]: Transition 19
                  - button "Add Transition 19" [ref=e484]:
                    - img
                - button "Transition 20 Add Transition 20" [ref=e485] [cursor=pointer]:
                  - generic [ref=e487]: Transition 20
                  - button "Add Transition 20" [ref=e489]:
                    - img
                - button "Transition 21 Add Transition 21" [ref=e490] [cursor=pointer]:
                  - generic [ref=e492]: Transition 21
                  - button "Add Transition 21" [ref=e494]:
                    - img
                - button "Transition 22 Add Transition 22" [ref=e495] [cursor=pointer]:
                  - generic [ref=e497]: Transition 22
                  - button "Add Transition 22" [ref=e499]:
                    - img
                - button "Transition 23 Add Transition 23" [ref=e500] [cursor=pointer]:
                  - generic [ref=e502]: Transition 23
                  - button "Add Transition 23" [ref=e504]:
                    - img
                - button "Transition 24 Add Transition 24" [ref=e505] [cursor=pointer]:
                  - generic [ref=e507]: Transition 24
                  - button "Add Transition 24" [ref=e509]:
                    - img
                - button "Transition 25 Add Transition 25" [ref=e510] [cursor=pointer]:
                  - generic [ref=e512]: Transition 25
                  - button "Add Transition 25" [ref=e514]:
                    - img
                - button "Transition 26 Add Transition 26" [ref=e515] [cursor=pointer]:
                  - generic [ref=e517]: Transition 26
                  - button "Add Transition 26" [ref=e519]:
                    - img
                - button "Transition 27 Add Transition 27" [ref=e520] [cursor=pointer]:
                  - generic [ref=e522]: Transition 27
                  - button "Add Transition 27" [ref=e524]:
                    - img
                - button "Transition 28 Add Transition 28" [ref=e525] [cursor=pointer]:
                  - generic [ref=e527]: Transition 28
                  - button "Add Transition 28" [ref=e529]:
                    - img
                - button "Transition 29 Add Transition 29" [ref=e530] [cursor=pointer]:
                  - generic [ref=e532]: Transition 29
                  - button "Add Transition 29" [ref=e534]:
                    - img
                - button "Transition 30 Add Transition 30" [ref=e535] [cursor=pointer]:
                  - generic [ref=e537]: Transition 30
                  - button "Add Transition 30" [ref=e539]:
                    - img
                - button "Transition 31 Add Transition 31" [ref=e540] [cursor=pointer]:
                  - generic [ref=e542]: Transition 31
                  - button "Add Transition 31" [ref=e544]:
                    - img
                - button "Transition 32 Add Transition 32" [ref=e545] [cursor=pointer]:
                  - generic [ref=e547]: Transition 32
                  - button "Add Transition 32" [ref=e549]:
                    - img
                - button "Transition 33 Add Transition 33" [ref=e550] [cursor=pointer]:
                  - generic [ref=e552]: Transition 33
                  - button "Add Transition 33" [ref=e554]:
                    - img
                - button "Transition 34 Add Transition 34" [ref=e555] [cursor=pointer]:
                  - generic [ref=e557]: Transition 34
                  - button "Add Transition 34" [ref=e559]:
                    - img
                - button "Transition 35 Add Transition 35" [ref=e560] [cursor=pointer]:
                  - generic [ref=e562]: Transition 35
                  - button "Add Transition 35" [ref=e564]:
                    - img
                - button "Transition 36 Add Transition 36" [ref=e565] [cursor=pointer]:
                  - generic [ref=e567]: Transition 36
                  - button "Add Transition 36" [ref=e569]:
                    - img
                - button "Transition 37 Add Transition 37" [ref=e570] [cursor=pointer]:
                  - generic [ref=e572]: Transition 37
                  - button "Add Transition 37" [ref=e574]:
                    - img
                - button "Transition 38 Add Transition 38" [ref=e575] [cursor=pointer]:
                  - generic [ref=e577]: Transition 38
                  - button "Add Transition 38" [ref=e579]:
                    - img
                - button "Transition 39 Add Transition 39" [ref=e580] [cursor=pointer]:
                  - generic [ref=e582]: Transition 39
                  - button "Add Transition 39" [ref=e584]:
                    - img
                - button "Transition 40 Add Transition 40" [ref=e585] [cursor=pointer]:
                  - generic [ref=e587]: Transition 40
                  - button "Add Transition 40" [ref=e589]:
                    - img
                - button "Transition 41 Add Transition 41" [ref=e590] [cursor=pointer]:
                  - generic [ref=e592]: Transition 41
                  - button "Add Transition 41" [ref=e594]:
                    - img
                - button "Transition 42 Add Transition 42" [ref=e595] [cursor=pointer]:
                  - generic [ref=e597]: Transition 42
                  - button "Add Transition 42" [ref=e599]:
                    - img
                - button "Transition 43 Add Transition 43" [ref=e600] [cursor=pointer]:
                  - generic [ref=e602]: Transition 43
                  - button "Add Transition 43" [ref=e604]:
                    - img
                - button "Transition 44 Add Transition 44" [ref=e605] [cursor=pointer]:
                  - generic [ref=e607]: Transition 44
                  - button "Add Transition 44" [ref=e609]:
                    - img
                - button "Transition 45 Add Transition 45" [ref=e610] [cursor=pointer]:
                  - generic [ref=e612]: Transition 45
                  - button "Add Transition 45" [ref=e614]:
                    - img
                - button "Transition 46 Add Transition 46" [ref=e615] [cursor=pointer]:
                  - generic [ref=e617]: Transition 46
                  - button "Add Transition 46" [ref=e619]:
                    - img
                - button "Transition 47 Add Transition 47" [ref=e620] [cursor=pointer]:
                  - generic [ref=e622]: Transition 47
                  - button "Add Transition 47" [ref=e624]:
                    - img
                - button "Transition 48 Add Transition 48" [ref=e625] [cursor=pointer]:
                  - generic [ref=e627]: Transition 48
                  - button "Add Transition 48" [ref=e629]:
                    - img
                - button "Transition 49 Add Transition 49" [ref=e630] [cursor=pointer]:
                  - generic [ref=e632]: Transition 49
                  - button "Add Transition 49" [ref=e634]:
                    - img
                - button "Transition 50 Add Transition 50" [ref=e635] [cursor=pointer]:
                  - generic [ref=e637]: Transition 50
                  - button "Add Transition 50" [ref=e639]:
                    - img
                - button "Transition 51 Add Transition 51" [ref=e640] [cursor=pointer]:
                  - generic [ref=e642]: Transition 51
                  - button "Add Transition 51" [ref=e644]:
                    - img
                - button "Transition 52 Add Transition 52" [ref=e645] [cursor=pointer]:
                  - generic [ref=e647]: Transition 52
                  - button "Add Transition 52" [ref=e649]:
                    - img
                - button "Transition 53 Add Transition 53" [ref=e650] [cursor=pointer]:
                  - generic [ref=e652]: Transition 53
                  - button "Add Transition 53" [ref=e654]:
                    - img
                - button "Transition 54 Add Transition 54" [ref=e655] [cursor=pointer]:
                  - generic [ref=e657]: Transition 54
                  - button "Add Transition 54" [ref=e659]:
                    - img
                - button "Transition 55 Add Transition 55" [ref=e660] [cursor=pointer]:
                  - generic [ref=e662]: Transition 55
                  - button "Add Transition 55" [ref=e664]:
                    - img
                - button "Transition 56 Add Transition 56" [ref=e665] [cursor=pointer]:
                  - generic [ref=e667]: Transition 56
                  - button "Add Transition 56" [ref=e669]:
                    - img
                - button "Transition 57 Add Transition 57" [ref=e670] [cursor=pointer]:
                  - generic [ref=e672]: Transition 57
                  - button "Add Transition 57" [ref=e674]:
                    - img
                - button "Transition 58 Add Transition 58" [ref=e675] [cursor=pointer]:
                  - generic [ref=e677]: Transition 58
                  - button "Add Transition 58" [ref=e679]:
                    - img
                - button "Transition 59 Add Transition 59" [ref=e680] [cursor=pointer]:
                  - generic [ref=e682]: Transition 59
                  - button "Add Transition 59" [ref=e684]:
                    - img
                - button "Transition 60 Add Transition 60" [ref=e685] [cursor=pointer]:
                  - generic [ref=e687]: Transition 60
                  - button "Add Transition 60" [ref=e689]:
                    - img
                - button "Transition 61 Add Transition 61" [ref=e690] [cursor=pointer]:
                  - generic [ref=e692]: Transition 61
                  - button "Add Transition 61" [ref=e694]:
                    - img
                - button "Transition 62 Add Transition 62" [ref=e695] [cursor=pointer]:
                  - generic [ref=e697]: Transition 62
                  - button "Add Transition 62" [ref=e699]:
                    - img
                - button "Transition 63 Add Transition 63" [ref=e700] [cursor=pointer]:
                  - generic [ref=e702]: Transition 63
                  - button "Add Transition 63" [ref=e704]:
                    - img
                - button "Transition 64 Add Transition 64" [ref=e705] [cursor=pointer]:
                  - generic [ref=e707]: Transition 64
                  - button "Add Transition 64" [ref=e709]:
                    - img
                - button "Transition 65 Add Transition 65" [ref=e710] [cursor=pointer]:
                  - generic [ref=e712]: Transition 65
                  - button "Add Transition 65" [ref=e714]:
                    - img
                - button "Transition 66 Add Transition 66" [ref=e715] [cursor=pointer]:
                  - generic [ref=e717]: Transition 66
                  - button "Add Transition 66" [ref=e719]:
                    - img
                - button "Transition 67 Add Transition 67" [ref=e720] [cursor=pointer]:
                  - generic [ref=e722]: Transition 67
                  - button "Add Transition 67" [ref=e724]:
                    - img
                - button "Transition 68 Add Transition 68" [ref=e725] [cursor=pointer]:
                  - generic [ref=e727]: Transition 68
                  - button "Add Transition 68" [ref=e729]:
                    - img
                - button "Transition 69 Add Transition 69" [ref=e730] [cursor=pointer]:
                  - generic [ref=e732]: Transition 69
                  - button "Add Transition 69" [ref=e734]:
                    - img
                - button "Transition 70 Add Transition 70" [ref=e735] [cursor=pointer]:
                  - generic [ref=e737]: Transition 70
                  - button "Add Transition 70" [ref=e739]:
                    - img
                - button "Transition 71 Add Transition 71" [ref=e740] [cursor=pointer]:
                  - generic [ref=e742]: Transition 71
                  - button "Add Transition 71" [ref=e744]:
                    - img
                - button "Transition 72 Add Transition 72" [ref=e745] [cursor=pointer]:
                  - generic [ref=e747]: Transition 72
                  - button "Add Transition 72" [ref=e749]:
                    - img
                - button "Transition 73 Add Transition 73" [ref=e750] [cursor=pointer]:
                  - generic [ref=e752]: Transition 73
                  - button "Add Transition 73" [ref=e754]:
                    - img
                - button "Transition 74 Add Transition 74" [ref=e755] [cursor=pointer]:
                  - generic [ref=e757]: Transition 74
                  - button "Add Transition 74" [ref=e759]:
                    - img
                - button "Transition 75 Add Transition 75" [ref=e760] [cursor=pointer]:
                  - generic [ref=e762]: Transition 75
                  - button "Add Transition 75" [ref=e764]:
                    - img
                - button "Transition 76 Add Transition 76" [ref=e765] [cursor=pointer]:
                  - generic [ref=e767]: Transition 76
                  - button "Add Transition 76" [ref=e769]:
                    - img
                - button "Transition 77 Add Transition 77" [ref=e770] [cursor=pointer]:
                  - generic [ref=e772]: Transition 77
                  - button "Add Transition 77" [ref=e774]:
                    - img
                - button "Transition 78 Add Transition 78" [ref=e775] [cursor=pointer]:
                  - generic [ref=e777]: Transition 78
                  - button "Add Transition 78" [ref=e779]:
                    - img
                - button "Transition 79 Add Transition 79" [ref=e780] [cursor=pointer]:
                  - generic [ref=e782]: Transition 79
                  - button "Add Transition 79" [ref=e784]:
                    - img
                - button "Transition 80 Add Transition 80" [ref=e785] [cursor=pointer]:
                  - generic [ref=e787]: Transition 80
                  - button "Add Transition 80" [ref=e789]:
                    - img
                - button "Transition 81 Add Transition 81" [ref=e790] [cursor=pointer]:
                  - generic [ref=e792]: Transition 81
                  - button "Add Transition 81" [ref=e794]:
                    - img
                - button "Transition 82 Add Transition 82" [ref=e795] [cursor=pointer]:
                  - generic [ref=e797]: Transition 82
                  - button "Add Transition 82" [ref=e799]:
                    - img
                - button "Transition 83 Add Transition 83" [ref=e800] [cursor=pointer]:
                  - generic [ref=e802]: Transition 83
                  - button "Add Transition 83" [ref=e804]:
                    - img
                - button "Transition 84 Add Transition 84" [ref=e805] [cursor=pointer]:
                  - generic [ref=e807]: Transition 84
                  - button "Add Transition 84" [ref=e809]:
                    - img
                - button "Transition 85 Add Transition 85" [ref=e810] [cursor=pointer]:
                  - generic [ref=e812]: Transition 85
                  - button "Add Transition 85" [ref=e814]:
                    - img
                - button "Transition 86 Add Transition 86" [ref=e815] [cursor=pointer]:
                  - generic [ref=e817]: Transition 86
                  - button "Add Transition 86" [ref=e819]:
                    - img
                - button "Transition 87 Add Transition 87" [ref=e820] [cursor=pointer]:
                  - generic [ref=e822]: Transition 87
                  - button "Add Transition 87" [ref=e824]:
                    - img
                - button "Transition 88 Add Transition 88" [ref=e825] [cursor=pointer]:
                  - generic [ref=e827]: Transition 88
                  - button "Add Transition 88" [ref=e829]:
                    - img
                - button "Transition 89 Add Transition 89" [ref=e830] [cursor=pointer]:
                  - generic [ref=e832]: Transition 89
                  - button "Add Transition 89" [ref=e834]:
                    - img
                - button "Transition 90 Add Transition 90" [ref=e835] [cursor=pointer]:
                  - generic [ref=e837]: Transition 90
                  - button "Add Transition 90" [ref=e839]:
                    - img
                - button "Transition 91 Add Transition 91" [ref=e840] [cursor=pointer]:
                  - generic [ref=e842]: Transition 91
                  - button "Add Transition 91" [ref=e844]:
                    - img
                - button "Transition 92 Add Transition 92" [ref=e845] [cursor=pointer]:
                  - generic [ref=e847]: Transition 92
                  - button "Add Transition 92" [ref=e849]:
                    - img
                - button "Transition 93 Add Transition 93" [ref=e850] [cursor=pointer]:
                  - generic [ref=e852]: Transition 93
                  - button "Add Transition 93" [ref=e854]:
                    - img
                - button "Transition 94 Add Transition 94" [ref=e855] [cursor=pointer]:
                  - generic [ref=e857]: Transition 94
                  - button "Add Transition 94" [ref=e859]:
                    - img
                - button "Transition 95 Add Transition 95" [ref=e860] [cursor=pointer]:
                  - generic [ref=e862]: Transition 95
                  - button "Add Transition 95" [ref=e864]:
                    - img
                - button "Transition 96 Add Transition 96" [ref=e865] [cursor=pointer]:
                  - generic [ref=e867]: Transition 96
                  - button "Add Transition 96" [ref=e869]:
                    - img
                - button "Transition 97 Add Transition 97" [ref=e870] [cursor=pointer]:
                  - generic [ref=e872]: Transition 97
                  - button "Add Transition 97" [ref=e874]:
                    - img
                - button "Transition 98 Add Transition 98" [ref=e875] [cursor=pointer]:
                  - generic [ref=e877]: Transition 98
                  - button "Add Transition 98" [ref=e879]:
                    - img
                - button "Transition 99 Add Transition 99" [ref=e880] [cursor=pointer]:
                  - generic [ref=e882]: Transition 99
                  - button "Add Transition 99" [ref=e884]:
                    - img
                - button "Transition 100 Add Transition 100" [ref=e885] [cursor=pointer]:
                  - generic [ref=e887]: Transition 100
                  - button "Add Transition 100" [ref=e889]:
                    - img
                - button "Crossfade Add Crossfade" [ref=e890] [cursor=pointer]:
                  - generic [ref=e892]: Crossfade
                  - button "Add Crossfade" [ref=e894]:
                    - img
                - button "Fade to Black Add Fade to Black" [ref=e895] [cursor=pointer]:
                  - generic [ref=e897]: Fade to Black
                  - button "Add Fade to Black" [ref=e899]:
                    - img
                - button "Fade to White Add Fade to White" [ref=e900] [cursor=pointer]:
                  - generic [ref=e902]: Fade to White
                  - button "Add Fade to White" [ref=e904]:
                    - img
                - button "Dip to Color Add Dip to Color" [ref=e905] [cursor=pointer]:
                  - generic [ref=e907]: Dip to Color
                  - button "Add Dip to Color" [ref=e909]:
                    - img
                - button "Soft Fade Add Soft Fade" [ref=e910] [cursor=pointer]:
                  - generic [ref=e912]: Soft Fade
                  - button "Add Soft Fade" [ref=e914]:
                    - img
                - button "Linear Fade Add Linear Fade" [ref=e915] [cursor=pointer]:
                  - generic [ref=e917]: Linear Fade
                  - button "Add Linear Fade" [ref=e919]:
                    - img
                - button "Eased Fade Add Eased Fade" [ref=e920] [cursor=pointer]:
                  - generic [ref=e922]: Eased Fade
                  - button "Add Eased Fade" [ref=e924]:
                    - img
                - button "Blur Fade Add Blur Fade" [ref=e925] [cursor=pointer]:
                  - generic [ref=e927]: Blur Fade
                  - button "Add Blur Fade" [ref=e929]:
                    - img
                - button "Fade & Scale Add Fade & Scale" [ref=e930] [cursor=pointer]:
                  - generic [ref=e932]: Fade & Scale
                  - button "Add Fade & Scale" [ref=e934]:
                    - img
                - button "Fade & Rotate Add Fade & Rotate" [ref=e935] [cursor=pointer]:
                  - generic [ref=e937]: Fade & Rotate
                  - button "Add Fade & Rotate" [ref=e939]:
                    - img
                - button "Fade Blur Out Add Fade Blur Out" [ref=e940] [cursor=pointer]:
                  - generic [ref=e942]: Fade Blur Out
                  - button "Add Fade Blur Out" [ref=e944]:
                    - img
                - button "Color Fade Add Color Fade" [ref=e945] [cursor=pointer]:
                  - generic [ref=e947]: Color Fade
                  - button "Add Color Fade" [ref=e949]:
                    - img
                - button "Elastic Fade Add Elastic Fade" [ref=e950] [cursor=pointer]:
                  - generic [ref=e952]: Elastic Fade
                  - button "Add Elastic Fade" [ref=e954]:
                    - img
                - button "Instant Cut Add Instant Cut" [ref=e955] [cursor=pointer]:
                  - generic [ref=e957]: Instant Cut
                  - button "Add Instant Cut" [ref=e959]:
                    - img
                - button "Slide Left Add Slide Left" [ref=e960] [cursor=pointer]:
                  - generic [ref=e962]: Slide Left
                  - button "Add Slide Left" [ref=e964]:
                    - img
                - button "Slide Right Add Slide Right" [ref=e965] [cursor=pointer]:
                  - generic [ref=e967]: Slide Right
                  - button "Add Slide Right" [ref=e969]:
                    - img
                - button "Slide Up Add Slide Up" [ref=e970] [cursor=pointer]:
                  - generic [ref=e972]: Slide Up
                  - button "Add Slide Up" [ref=e974]:
                    - img
                - button "Slide Down Add Slide Down" [ref=e975] [cursor=pointer]:
                  - generic [ref=e977]: Slide Down
                  - button "Add Slide Down" [ref=e979]:
                    - img
                - button "Diagonal TL Add Diagonal TL" [ref=e980] [cursor=pointer]:
                  - generic [ref=e982]: Diagonal TL
                  - button "Add Diagonal TL" [ref=e984]:
                    - img
                - button "Diagonal TR Add Diagonal TR" [ref=e985] [cursor=pointer]:
                  - generic [ref=e987]: Diagonal TR
                  - button "Add Diagonal TR" [ref=e989]:
                    - img
                - button "Diagonal BL Add Diagonal BL" [ref=e990] [cursor=pointer]:
                  - generic [ref=e992]: Diagonal BL
                  - button "Add Diagonal BL" [ref=e994]:
                    - img
                - button "Diagonal BR Add Diagonal BR" [ref=e995] [cursor=pointer]:
                  - generic [ref=e997]: Diagonal BR
                  - button "Add Diagonal BR" [ref=e999]:
                    - img
                - button "Split Vertical Add Split Vertical" [ref=e1000] [cursor=pointer]:
                  - generic [ref=e1002]: Split Vertical
                  - button "Add Split Vertical" [ref=e1004]:
                    - img
                - button "Split Horizontal Add Split Horizontal" [ref=e1005] [cursor=pointer]:
                  - generic [ref=e1007]: Split Horizontal
                  - button "Add Split Horizontal" [ref=e1009]:
                    - img
                - button "Rebound Slide Add Rebound Slide" [ref=e1010] [cursor=pointer]:
                  - generic [ref=e1012]: Rebound Slide
                  - button "Add Rebound Slide" [ref=e1014]:
                    - img
                - button "Smooth Slide Add Smooth Slide" [ref=e1015] [cursor=pointer]:
                  - generic [ref=e1017]: Smooth Slide
                  - button "Add Smooth Slide" [ref=e1019]:
                    - img
                - button "Fast Slide Add Fast Slide" [ref=e1020] [cursor=pointer]:
                  - generic [ref=e1022]: Fast Slide
                  - button "Add Fast Slide" [ref=e1024]:
                    - img
                - button "Slow Slide Add Slow Slide" [ref=e1025] [cursor=pointer]:
                  - generic [ref=e1027]: Slow Slide
                  - button "Add Slow Slide" [ref=e1029]:
                    - img
                - button "Push Left Add Push Left" [ref=e1030] [cursor=pointer]:
                  - generic [ref=e1032]: Push Left
                  - button "Add Push Left" [ref=e1034]:
                    - img
                - button "Push Right Add Push Right" [ref=e1035] [cursor=pointer]:
                  - generic [ref=e1037]: Push Right
                  - button "Add Push Right" [ref=e1039]:
                    - img
                - button "Push Up Add Push Up" [ref=e1040] [cursor=pointer]:
                  - generic [ref=e1042]: Push Up
                  - button "Add Push Up" [ref=e1044]:
                    - img
                - button "Push Down Add Push Down" [ref=e1045] [cursor=pointer]:
                  - generic [ref=e1047]: Push Down
                  - button "Add Push Down" [ref=e1049]:
                    - img
                - button "Cross Push Left Add Cross Push Left" [ref=e1050] [cursor=pointer]:
                  - generic [ref=e1052]: Cross Push Left
                  - button "Add Cross Push Left" [ref=e1054]:
                    - img
                - button "Cross Push Right Add Cross Push Right" [ref=e1055] [cursor=pointer]:
                  - generic [ref=e1057]: Cross Push Right
                  - button "Add Cross Push Right" [ref=e1059]:
                    - img
                - button "Push Up Ease Add Push Up Ease" [ref=e1060] [cursor=pointer]:
                  - generic [ref=e1062]: Push Up Ease
                  - button "Add Push Up Ease" [ref=e1064]:
                    - img
                - button "Push Down Ease Add Push Down Ease" [ref=e1065] [cursor=pointer]:
                  - generic [ref=e1067]: Push Down Ease
                  - button "Add Push Down Ease" [ref=e1069]:
                    - img
                - button "Cover Push Add Cover Push" [ref=e1070] [cursor=pointer]:
                  - generic [ref=e1072]: Cover Push
                  - button "Add Cover Push" [ref=e1074]:
                    - img
                - button "Reveal Push Add Reveal Push" [ref=e1075] [cursor=pointer]:
                  - generic [ref=e1077]: Reveal Push
                  - button "Add Reveal Push" [ref=e1079]:
                    - img
                - button "Half Push Add Half Push" [ref=e1080] [cursor=pointer]:
                  - generic [ref=e1082]: Half Push
                  - button "Add Half Push" [ref=e1084]:
                    - img
                - button "Quarter Push Add Quarter Push" [ref=e1085] [cursor=pointer]:
                  - generic [ref=e1087]: Quarter Push
                  - button "Add Quarter Push" [ref=e1089]:
                    - img
                - button "Elastic Push Add Elastic Push" [ref=e1090] [cursor=pointer]:
                  - generic [ref=e1092]: Elastic Push
                  - button "Add Elastic Push" [ref=e1094]:
                    - img
                - button "Zoom In Add Zoom In" [ref=e1095] [cursor=pointer]:
                  - generic [ref=e1097]: Zoom In
                  - button "Add Zoom In" [ref=e1099]:
                    - img
                - button "Zoom Out Add Zoom Out" [ref=e1100] [cursor=pointer]:
                  - generic [ref=e1102]: Zoom Out
                  - button "Add Zoom Out" [ref=e1104]:
                    - img
                - button "Zoom In Cross Add Zoom In Cross" [ref=e1105] [cursor=pointer]:
                  - generic [ref=e1107]: Zoom In Cross
                  - button "Add Zoom In Cross" [ref=e1109]:
                    - img
                - button "Zoom Out Cross Add Zoom Out Cross" [ref=e1110] [cursor=pointer]:
                  - generic [ref=e1112]: Zoom Out Cross
                  - button "Add Zoom Out Cross" [ref=e1114]:
                    - img
                - button "Pinch Zoom Add Pinch Zoom" [ref=e1115] [cursor=pointer]:
                  - generic [ref=e1117]: Pinch Zoom
                  - button "Add Pinch Zoom" [ref=e1119]:
                    - img
                - button "Blast Zoom Add Blast Zoom" [ref=e1120] [cursor=pointer]:
                  - generic [ref=e1122]: Blast Zoom
                  - button "Add Blast Zoom" [ref=e1124]:
                    - img
                - button "Ken Burns Add Ken Burns" [ref=e1125] [cursor=pointer]:
                  - generic [ref=e1127]: Ken Burns
                  - button "Add Ken Burns" [ref=e1129]:
                    - img
                - button "Spin Zoom Add Spin Zoom" [ref=e1130] [cursor=pointer]:
                  - generic [ref=e1132]: Spin Zoom
                  - button "Add Spin Zoom" [ref=e1134]:
                    - img
                - button "Rush Zoom Add Rush Zoom" [ref=e1135] [cursor=pointer]:
                  - generic [ref=e1137]: Rush Zoom
                  - button "Add Rush Zoom" [ref=e1139]:
                    - img
                - button "Bounce Zoom Add Bounce Zoom" [ref=e1140] [cursor=pointer]:
                  - generic [ref=e1142]: Bounce Zoom
                  - button "Add Bounce Zoom" [ref=e1144]:
                    - img
                - button "Elastic Zoom Add Elastic Zoom" [ref=e1145] [cursor=pointer]:
                  - generic [ref=e1147]: Elastic Zoom
                  - button "Add Elastic Zoom" [ref=e1149]:
                    - img
                - button "Slow Zoom Add Slow Zoom" [ref=e1150] [cursor=pointer]:
                  - generic [ref=e1152]: Slow Zoom
                  - button "Add Slow Zoom" [ref=e1154]:
                    - img
                - button "Fast Zoom Add Fast Zoom" [ref=e1155] [cursor=pointer]:
                  - generic [ref=e1157]: Fast Zoom
                  - button "Add Fast Zoom" [ref=e1159]:
                    - img
                - button "Corner Zoom Add Corner Zoom" [ref=e1160] [cursor=pointer]:
                  - generic [ref=e1162]: Corner Zoom
                  - button "Add Corner Zoom" [ref=e1164]:
                    - img
                - button "Rotate 90 Add Rotate 90" [ref=e1165] [cursor=pointer]:
                  - generic [ref=e1167]: Rotate 90
                  - button "Add Rotate 90" [ref=e1169]:
                    - img
                - button "Rotate 180 Add Rotate 180" [ref=e1170] [cursor=pointer]:
                  - generic [ref=e1172]: Rotate 180
                  - button "Add Rotate 180" [ref=e1174]:
                    - img
                - button "Rotate 360 Add Rotate 360" [ref=e1175] [cursor=pointer]:
                  - generic [ref=e1177]: Rotate 360
                  - button "Add Rotate 360" [ref=e1179]:
                    - img
                - button "Half Spin Add Half Spin" [ref=e1180] [cursor=pointer]:
                  - generic [ref=e1182]: Half Spin
                  - button "Add Half Spin" [ref=e1184]:
                    - img
                - button "Quarter Spin Add Quarter Spin" [ref=e1185] [cursor=pointer]:
                  - generic [ref=e1187]: Quarter Spin
                  - button "Add Quarter Spin" [ref=e1189]:
                    - img
                - button "Swing Rotate Add Swing Rotate" [ref=e1190] [cursor=pointer]:
                  - generic [ref=e1192]: Swing Rotate
                  - button "Add Swing Rotate" [ref=e1194]:
                    - img
                - button "Flip Y Add Flip Y" [ref=e1195] [cursor=pointer]:
                  - generic [ref=e1197]: Flip Y
                  - button "Add Flip Y" [ref=e1199]:
                    - img
                - button "Flip X Add Flip X" [ref=e1200] [cursor=pointer]:
                  - generic [ref=e1202]: Flip X
                  - button "Add Flip X" [ref=e1204]:
                    - img
                - button "Bars Rotate Add Bars Rotate" [ref=e1205] [cursor=pointer]:
                  - generic [ref=e1207]: Bars Rotate
                  - button "Add Bars Rotate" [ref=e1209]:
                    - img
                - button "Clockwise Add Clockwise" [ref=e1210] [cursor=pointer]:
                  - generic [ref=e1212]: Clockwise
                  - button "Add Clockwise" [ref=e1214]:
                    - img
                - button "Counter Add Counter" [ref=e1215] [cursor=pointer]:
                  - generic [ref=e1217]: Counter
                  - button "Add Counter" [ref=e1219]:
                    - img
                - button "Fast Spin Add Fast Spin" [ref=e1220] [cursor=pointer]:
                  - generic [ref=e1222]: Fast Spin
                  - button "Add Fast Spin" [ref=e1224]:
                    - img
                - button "Slow Spin Add Slow Spin" [ref=e1225] [cursor=pointer]:
                  - generic [ref=e1227]: Slow Spin
                  - button "Add Slow Spin" [ref=e1229]:
                    - img
                - button "Wipe Left Add Wipe Left" [ref=e1230] [cursor=pointer]:
                  - generic [ref=e1232]: Wipe Left
                  - button "Add Wipe Left" [ref=e1234]:
                    - img
                - button "Wipe Right Add Wipe Right" [ref=e1235] [cursor=pointer]:
                  - generic [ref=e1237]: Wipe Right
                  - button "Add Wipe Right" [ref=e1239]:
                    - img
                - button "Wipe Up Add Wipe Up" [ref=e1240] [cursor=pointer]:
                  - generic [ref=e1242]: Wipe Up
                  - button "Add Wipe Up" [ref=e1244]:
                    - img
                - button "Wipe Down Add Wipe Down" [ref=e1245] [cursor=pointer]:
                  - generic [ref=e1247]: Wipe Down
                  - button "Add Wipe Down" [ref=e1249]:
                    - img
                - button "Diagonal Wipe Add Diagonal Wipe" [ref=e1250] [cursor=pointer]:
                  - generic [ref=e1252]: Diagonal Wipe
                  - button "Add Diagonal Wipe" [ref=e1254]:
                    - img
                - button "Clock Wipe Add Clock Wipe" [ref=e1255] [cursor=pointer]:
                  - generic [ref=e1257]: Clock Wipe
                  - button "Add Clock Wipe" [ref=e1259]:
                    - img
                - button "Counter Wipe Add Counter Wipe" [ref=e1260] [cursor=pointer]:
                  - generic [ref=e1262]: Counter Wipe
                  - button "Add Counter Wipe" [ref=e1264]:
                    - img
                - button "Circle Wipe Add Circle Wipe" [ref=e1265] [cursor=pointer]:
                  - generic [ref=e1267]: Circle Wipe
                  - button "Add Circle Wipe" [ref=e1269]:
                    - img
                - button "Iris Add Iris" [ref=e1270] [cursor=pointer]:
                  - generic [ref=e1272]: Iris
                  - button "Add Iris" [ref=e1274]:
                    - img
                - button "Barn Door Add Barn Door" [ref=e1275] [cursor=pointer]:
                  - generic [ref=e1277]: Barn Door
                  - button "Add Barn Door" [ref=e1279]:
                    - img
                - button "Venetian Blinds Add Venetian Blinds" [ref=e1280] [cursor=pointer]:
                  - generic [ref=e1282]: Venetian Blinds
                  - button "Add Venetian Blinds" [ref=e1284]:
                    - img
                - button "Checker Wipe Add Checker Wipe" [ref=e1285] [cursor=pointer]:
                  - generic [ref=e1287]: Checker Wipe
                  - button "Add Checker Wipe" [ref=e1289]:
                    - img
                - button "Diagonal BR Add Diagonal BR" [ref=e1290] [cursor=pointer]:
                  - generic [ref=e1292]: Diagonal BR
                  - button "Add Diagonal BR" [ref=e1294]:
                    - img
                - button "Stripe Wipe Add Stripe Wipe" [ref=e1295] [cursor=pointer]:
                  - generic [ref=e1297]: Stripe Wipe
                  - button "Add Stripe Wipe" [ref=e1299]:
                    - img
                - button "Blob Morph Add Blob Morph" [ref=e1300] [cursor=pointer]:
                  - generic [ref=e1302]: Blob Morph
                  - button "Add Blob Morph" [ref=e1304]:
                    - img
                - button "Liquid Morph Add Liquid Morph" [ref=e1305] [cursor=pointer]:
                  - generic [ref=e1307]: Liquid Morph
                  - button "Add Liquid Morph" [ref=e1309]:
                    - img
                - button "Blur Morph Add Blur Morph" [ref=e1310] [cursor=pointer]:
                  - generic [ref=e1312]: Blur Morph
                  - button "Add Blur Morph" [ref=e1314]:
                    - img
                - button "Color Morph Add Color Morph" [ref=e1315] [cursor=pointer]:
                  - generic [ref=e1317]: Color Morph
                  - button "Add Color Morph" [ref=e1319]:
                    - img
                - button "Page Turn Add Page Turn" [ref=e1320] [cursor=pointer]:
                  - generic [ref=e1322]: Page Turn
                  - button "Add Page Turn" [ref=e1324]:
                    - img
                - button "Swirl Morph Add Swirl Morph" [ref=e1325] [cursor=pointer]:
                  - generic [ref=e1327]: Swirl Morph
                  - button "Add Swirl Morph" [ref=e1329]:
                    - img
                - button "Distort Morph Add Distort Morph" [ref=e1330] [cursor=pointer]:
                  - generic [ref=e1332]: Distort Morph
                  - button "Add Distort Morph" [ref=e1334]:
                    - img
                - button "Pixelate Morph Add Pixelate Morph" [ref=e1335] [cursor=pointer]:
                  - generic [ref=e1337]: Pixelate Morph
                  - button "Add Pixelate Morph" [ref=e1339]:
                    - img
                - button "Smooth Blend Add Smooth Blend" [ref=e1340] [cursor=pointer]:
                  - generic [ref=e1342]: Smooth Blend
                  - button "Add Smooth Blend" [ref=e1344]:
                    - img
                - button "Quick Morph Add Quick Morph" [ref=e1345] [cursor=pointer]:
                  - generic [ref=e1347]: Quick Morph
                  - button "Add Quick Morph" [ref=e1349]:
                    - img
                - button "Slow Morph Add Slow Morph" [ref=e1350] [cursor=pointer]:
                  - generic [ref=e1352]: Slow Morph
                  - button "Add Slow Morph" [ref=e1354]:
                    - img
                - button "Burn Morph Add Burn Morph" [ref=e1355] [cursor=pointer]:
                  - generic [ref=e1357]: Burn Morph
                  - button "Add Burn Morph" [ref=e1359]:
                    - img
                - button "Flow Morph Add Flow Morph" [ref=e1360] [cursor=pointer]:
                  - generic [ref=e1362]: Flow Morph
                  - button "Add Flow Morph" [ref=e1364]:
                    - img
                - button "RGB Split Add RGB Split" [ref=e1365] [cursor=pointer]:
                  - generic [ref=e1367]: RGB Split
                  - button "Add RGB Split" [ref=e1369]:
                    - img
                - button "Pixelate Add Pixelate" [ref=e1370] [cursor=pointer]:
                  - generic [ref=e1372]: Pixelate
                  - button "Add Pixelate" [ref=e1374]:
                    - img
                - button "Datamosh Add Datamosh" [ref=e1375] [cursor=pointer]:
                  - generic [ref=e1377]: Datamosh
                  - button "Add Datamosh" [ref=e1379]:
                    - img
                - button "Scan Glitch Add Scan Glitch" [ref=e1380] [cursor=pointer]:
                  - generic [ref=e1382]: Scan Glitch
                  - button "Add Scan Glitch" [ref=e1384]:
                    - img
                - button "Block Glitch Add Block Glitch" [ref=e1385] [cursor=pointer]:
                  - generic [ref=e1387]: Block Glitch
                  - button "Add Block Glitch" [ref=e1389]:
                    - img
                - button "Bar Glitch Add Bar Glitch" [ref=e1390] [cursor=pointer]:
                  - generic [ref=e1392]: Bar Glitch
                  - button "Add Bar Glitch" [ref=e1394]:
                    - img
                - button "Static Noise Add Static Noise" [ref=e1395] [cursor=pointer]:
                  - generic [ref=e1397]: Static Noise
                  - button "Add Static Noise" [ref=e1399]:
                    - img
                - button "Displacement Add Displacement" [ref=e1400] [cursor=pointer]:
                  - generic [ref=e1402]: Displacement
                  - button "Add Displacement" [ref=e1404]:
                    - img
                - button "VHS Add VHS" [ref=e1405] [cursor=pointer]:
                  - generic [ref=e1407]: VHS
                  - button "Add VHS" [ref=e1409]:
                    - img
                - button "CRT Add CRT" [ref=e1410] [cursor=pointer]:
                  - generic [ref=e1412]: CRT
                  - button "Add CRT" [ref=e1414]:
                    - img
                - button "Mosaic Add Mosaic" [ref=e1415] [cursor=pointer]:
                  - generic [ref=e1417]: Mosaic
                  - button "Add Mosaic" [ref=e1419]:
                    - img
                - button "Shake Add Shake" [ref=e1420] [cursor=pointer]:
                  - generic [ref=e1422]: Shake
                  - button "Add Shake" [ref=e1424]:
                    - img
                - button "Strobe Add Strobe" [ref=e1425] [cursor=pointer]:
                  - generic [ref=e1427]: Strobe
                  - button "Add Strobe" [ref=e1429]:
                    - img
                - button "Hard Cut Add Hard Cut" [ref=e1430] [cursor=pointer]:
                  - generic [ref=e1432]: Hard Cut
                  - button "Add Hard Cut" [ref=e1434]:
                    - img
                - button "Wave Add Wave" [ref=e1435] [cursor=pointer]:
                  - generic [ref=e1437]: Wave
                  - button "Add Wave" [ref=e1439]:
                    - img
                - button "Ripple Add Ripple" [ref=e1440] [cursor=pointer]:
                  - generic [ref=e1442]: Ripple
                  - button "Add Ripple" [ref=e1444]:
                    - img
                - button "Melt Add Melt" [ref=e1445] [cursor=pointer]:
                  - generic [ref=e1447]: Melt
                  - button "Add Melt" [ref=e1449]:
                    - img
                - button "Bubble Add Bubble" [ref=e1450] [cursor=pointer]:
                  - generic [ref=e1452]: Bubble
                  - button "Add Bubble" [ref=e1454]:
                    - img
                - button "Fluid Add Fluid" [ref=e1455] [cursor=pointer]:
                  - generic [ref=e1457]: Fluid
                  - button "Add Fluid" [ref=e1459]:
                    - img
                - button "Drip Add Drip" [ref=e1460] [cursor=pointer]:
                  - generic [ref=e1462]: Drip
                  - button "Add Drip" [ref=e1464]:
                    - img
                - button "Pour Add Pour" [ref=e1465] [cursor=pointer]:
                  - generic [ref=e1467]: Pour
                  - button "Add Pour" [ref=e1469]:
                    - img
                - button "Splash Add Splash" [ref=e1470] [cursor=pointer]:
                  - generic [ref=e1472]: Splash
                  - button "Add Splash" [ref=e1474]:
                    - img
                - button "Liquid Dissolve Add Liquid Dissolve" [ref=e1475] [cursor=pointer]:
                  - generic [ref=e1477]: Liquid Dissolve
                  - button "Add Liquid Dissolve" [ref=e1479]:
                    - img
                - button "Pulse Liquid Add Pulse Liquid" [ref=e1480] [cursor=pointer]:
                  - generic [ref=e1482]: Pulse Liquid
                  - button "Add Pulse Liquid" [ref=e1484]:
                    - img
                - button "Elastic Liquid Add Elastic Liquid" [ref=e1485] [cursor=pointer]:
                  - generic [ref=e1487]: Elastic Liquid
                  - button "Add Elastic Liquid" [ref=e1489]:
                    - img
                - button "Mesh Add Mesh" [ref=e1490] [cursor=pointer]:
                  - generic [ref=e1492]: Mesh
                  - button "Add Mesh" [ref=e1494]:
                    - img
                - button "Soft Liquid Add Soft Liquid" [ref=e1495] [cursor=pointer]:
                  - generic [ref=e1497]: Soft Liquid
                  - button "Add Soft Liquid" [ref=e1499]:
                    - img
                - button "Light Leak Add Light Leak" [ref=e1500] [cursor=pointer]:
                  - generic [ref=e1502]: Light Leak
                  - button "Add Light Leak" [ref=e1504]:
                    - img
                - button "Flash Add Flash" [ref=e1505] [cursor=pointer]:
                  - generic [ref=e1507]: Flash
                  - button "Add Flash" [ref=e1509]:
                    - img
                - button "Flash White Add Flash White" [ref=e1510] [cursor=pointer]:
                  - generic [ref=e1512]: Flash White
                  - button "Add Flash White" [ref=e1514]:
                    - img
                - button "Flash Color Add Flash Color" [ref=e1515] [cursor=pointer]:
                  - generic [ref=e1517]: Flash Color
                  - button "Add Flash Color" [ref=e1519]:
                    - img
                - button "Light Strobe Add Light Strobe" [ref=e1520] [cursor=pointer]:
                  - generic [ref=e1522]: Light Strobe
                  - button "Add Light Strobe" [ref=e1524]:
                    - img
                - button "Burst Add Burst" [ref=e1525] [cursor=pointer]:
                  - generic [ref=e1527]: Burst
                  - button "Add Burst" [ref=e1529]:
                    - img
                - button "Pop Add Pop" [ref=e1530] [cursor=pointer]:
                  - generic [ref=e1532]: Pop
                  - button "Add Pop" [ref=e1534]:
                    - img
                - button "Bright Fade Add Bright Fade" [ref=e1535] [cursor=pointer]:
                  - generic [ref=e1537]: Bright Fade
                  - button "Add Bright Fade" [ref=e1539]:
                    - img
                - button "Warm Glow Add Warm Glow" [ref=e1540] [cursor=pointer]:
                  - generic [ref=e1542]: Warm Glow
                  - button "Add Warm Glow" [ref=e1544]:
                    - img
                - button "Cool Glow Add Cool Glow" [ref=e1545] [cursor=pointer]:
                  - generic [ref=e1547]: Cool Glow
                  - button "Add Cool Glow" [ref=e1549]:
                    - img
                - button "Light Iris Add Light Iris" [ref=e1550] [cursor=pointer]:
                  - generic [ref=e1552]: Light Iris
                  - button "Add Light Iris" [ref=e1554]:
                    - img
                - button "Haze Add Haze" [ref=e1555] [cursor=pointer]:
                  - generic [ref=e1557]: Haze
                  - button "Add Haze" [ref=e1559]:
                    - img
                - button "Chroma Add Chroma" [ref=e1560] [cursor=pointer]:
                  - generic [ref=e1562]: Chroma
                  - button "Add Chroma" [ref=e1564]:
                    - img
                - button "Cube Add Cube" [ref=e1565] [cursor=pointer]:
                  - generic [ref=e1567]: Cube
                  - button "Add Cube" [ref=e1569]:
                    - img
                - button "Cube Up Add Cube Up" [ref=e1570] [cursor=pointer]:
                  - generic [ref=e1572]: Cube Up
                  - button "Add Cube Up" [ref=e1574]:
                    - img
                - button "Cube Down Add Cube Down" [ref=e1575] [cursor=pointer]:
                  - generic [ref=e1577]: Cube Down
                  - button "Add Cube Down" [ref=e1579]:
                    - img
                - button "Cube Left Add Cube Left" [ref=e1580] [cursor=pointer]:
                  - generic [ref=e1582]: Cube Left
                  - button "Add Cube Left" [ref=e1584]:
                    - img
                - button "Cube Right Add Cube Right" [ref=e1585] [cursor=pointer]:
                  - generic [ref=e1587]: Cube Right
                  - button "Add Cube Right" [ref=e1589]:
                    - img
                - button "3D Flip X Add 3D Flip X" [ref=e1590] [cursor=pointer]:
                  - generic [ref=e1592]: 3D Flip X
                  - button "Add 3D Flip X" [ref=e1594]:
                    - img
                - button "3D Flip Y Add 3D Flip Y" [ref=e1595] [cursor=pointer]:
                  - generic [ref=e1597]: 3D Flip Y
                  - button "Add 3D Flip Y" [ref=e1599]:
                    - img
                - button "3D Rotate X Add 3D Rotate X" [ref=e1600] [cursor=pointer]:
                  - generic [ref=e1602]: 3D Rotate X
                  - button "Add 3D Rotate X" [ref=e1604]:
                    - img
                - button "3D Rotate Y Add 3D Rotate Y" [ref=e1605] [cursor=pointer]:
                  - generic [ref=e1607]: 3D Rotate Y
                  - button "Add 3D Rotate Y" [ref=e1609]:
                    - img
                - button "Door Add Door" [ref=e1610] [cursor=pointer]:
                  - generic [ref=e1612]: Door
                  - button "Add Door" [ref=e1614]:
                    - img
                - button "Card Flip Add Card Flip" [ref=e1615] [cursor=pointer]:
                  - generic [ref=e1617]: Card Flip
                  - button "Add Card Flip" [ref=e1619]:
                    - img
                - button "Page Curl Add Page Curl" [ref=e1620] [cursor=pointer]:
                  - generic [ref=e1622]: Page Curl
                  - button "Add Page Curl" [ref=e1624]:
                    - img
                - button "Perspective Add Perspective" [ref=e1625] [cursor=pointer]:
                  - generic [ref=e1627]: Perspective
                  - button "Add Perspective" [ref=e1629]:
                    - img
                - button "3D Zoom Add 3D Zoom" [ref=e1630] [cursor=pointer]:
                  - generic [ref=e1632]: 3D Zoom
                  - button "Add 3D Zoom" [ref=e1634]:
                    - img
                - button "Checker Add Checker" [ref=e1635] [cursor=pointer]:
                  - generic [ref=e1637]: Checker
                  - button "Add Checker" [ref=e1639]:
                    - img
                - button "Dots Add Dots" [ref=e1640] [cursor=pointer]:
                  - generic [ref=e1642]: Dots
                  - button "Add Dots" [ref=e1644]:
                    - img
                - button "Triangles Add Triangles" [ref=e1645] [cursor=pointer]:
                  - generic [ref=e1647]: Triangles
                  - button "Add Triangles" [ref=e1649]:
                    - img
                - button "Hexagons Add Hexagons" [ref=e1650] [cursor=pointer]:
                  - generic [ref=e1652]: Hexagons
                  - button "Add Hexagons" [ref=e1654]:
                    - img
                - button "Stripes Add Stripes" [ref=e1655] [cursor=pointer]:
                  - generic [ref=e1657]: Stripes
                  - button "Add Stripes" [ref=e1659]:
                    - img
                - button "Grid Add Grid" [ref=e1660] [cursor=pointer]:
                  - generic [ref=e1662]: Grid
                  - button "Add Grid" [ref=e1664]:
                    - img
                - button "Spiral Add Spiral" [ref=e1665] [cursor=pointer]:
                  - generic [ref=e1667]: Spiral
                  - button "Add Spiral" [ref=e1669]:
                    - img
                - button "Sawtooth Add Sawtooth" [ref=e1670] [cursor=pointer]:
                  - generic [ref=e1672]: Sawtooth
                  - button "Add Sawtooth" [ref=e1674]:
                    - img
                - button "Circles Add Circles" [ref=e1675] [cursor=pointer]:
                  - generic [ref=e1677]: Circles
                  - button "Add Circles" [ref=e1679]:
                    - img
                - button "Blinds Add Blinds" [ref=e1680] [cursor=pointer]:
                  - generic [ref=e1682]: Blinds
                  - button "Add Blinds" [ref=e1684]:
                    - img
                - button "Pixels Add Pixels" [ref=e1685] [cursor=pointer]:
                  - generic [ref=e1687]: Pixels
                  - button "Add Pixels" [ref=e1689]:
                    - img
                - button "Curtain Add Curtain" [ref=e1690] [cursor=pointer]:
                  - generic [ref=e1692]: Curtain
                  - button "Add Curtain" [ref=e1694]:
                    - img
                - button "Shutter Add Shutter" [ref=e1695] [cursor=pointer]:
                  - generic [ref=e1697]: Shutter
                  - button "Add Shutter" [ref=e1699]:
                    - img
          - separator [ref=e1700]
          - generic [ref=e1704]:
            - generic [ref=e1706]:
              - generic [ref=e1707]:
                - button "Fit" [ref=e1708]
                - button "16:9" [ref=e1709]
                - button "Fullscreen preview" [ref=e1710]:
                  - img [ref=e1711]
                - button "More preview tools" [ref=e1713]:
                  - img [ref=e1714]
              - application "Preview canvas" [ref=e1720]
            - generic [ref=e1721]:
              - generic [ref=e1722]:
                - button "Show audio visualizer" [ref=e1723] [cursor=pointer]
                - button "00:00:00:00" [ref=e1731] [cursor=pointer]
                - generic [ref=e1732]: /
                - generic [ref=e1733]: 00:00:00:00
              - generic [ref=e1734]:
                - button "Go to start" [ref=e1735] [cursor=pointer]:
                  - img
                - button "Jump backward (or previous bookmark)" [ref=e1736] [cursor=pointer]:
                  - img
                - button "Play" [ref=e1737] [cursor=pointer]:
                  - img
                - button "Jump forward (or next bookmark)" [ref=e1738] [cursor=pointer]:
                  - img
                - button "Go to end" [ref=e1739] [cursor=pointer]:
                  - img
              - generic [ref=e1740]:
                - button "Enable loop playback" [ref=e1741] [cursor=pointer]:
                  - img
                - generic [ref=e1742]:
                  - button "Freehand draw" [ref=e1743] [cursor=pointer]:
                    - img
                  - button "Vector draw" [ref=e1744] [cursor=pointer]:
                    - img
                - button [ref=e1745] [cursor=pointer]:
                  - img
          - separator [ref=e1746]
          - generic [ref=e1749]:
            - generic [ref=e1752]:
              - generic [ref=e1754]:
                - generic [ref=e1755]: Details
                - button "Reset all" [ref=e1756]
              - generic [ref=e1758]:
                - generic [ref=e1759]:
                  - generic [ref=e1760]:
                    - img [ref=e1761]
                    - button "Regenerate thumbnail from first frame" [ref=e1763]:
                      - img [ref=e1764]
                  - generic [ref=e1767]:
                    - generic "Untitled Project" [ref=e1768]
                    - button "Reset all" [ref=e1769]
                  - generic [ref=e1771]: Project
                  - button "View full project info" [ref=e1772]
                - generic [ref=e1773]:
                  - generic [ref=e1774]:
                    - img [ref=e1775]
                    - generic [ref=e1778]: Project
                  - generic [ref=e1779]:
                    - generic [ref=e1780]:
                      - term [ref=e1781]: Duration
                      - definition [ref=e1782]: 0:00
                    - generic [ref=e1783]:
                      - term [ref=e1784]: Frame rate
                      - definition [ref=e1785]:
                        - generic [ref=e1786]:
                          - generic [ref=e1787]: "30"
                          - generic [ref=e1788]: fps
                    - generic [ref=e1789]:
                      - term [ref=e1790]: Resolution
                      - definition [ref=e1791]: 1920 × 1080
                    - generic [ref=e1792]:
                      - term [ref=e1793]: Background
                      - definition [ref=e1794]: Solid color
                - generic [ref=e1795]:
                  - generic [ref=e1796]:
                    - img [ref=e1797]
                    - generic [ref=e1801]: Activity
                  - generic [ref=e1802]:
                    - generic [ref=e1803]:
                      - term [ref=e1804]: Created
                      - definition [ref=e1805]: Jun 18, 2026
                    - generic [ref=e1806]:
                      - term [ref=e1807]: Modified
                      - definition [ref=e1808]: Jun 18, 2026
                    - generic [ref=e1809]:
                      - term [ref=e1810]: Project ID
                      - definition [ref=e1811]:
                        - generic [ref=e1812]:
                          - code [ref=e1813]: b472c30f
                          - button "Copy project ID" [ref=e1814]:
                            - img [ref=e1815]
            - generic [ref=e1818]:
              - button "Resize audio meter" [ref=e1819]
              - generic [ref=e1820]:
                - generic [ref=e1821]:
                  - generic:
                    - generic: "-60"
                    - generic: "-54"
                    - generic: "-48"
                    - generic: "-42"
                    - generic: "-36"
                    - generic: "-30"
                    - generic: "-24"
                    - generic: "-18"
                    - generic: "-12"
                    - generic: "-6"
                    - generic: "0"
                - generic [ref=e1822]:
                  - generic:
                    - generic: "-60"
                    - generic: "-54"
                    - generic: "-48"
                    - generic: "-42"
                    - generic: "-36"
                    - generic: "-30"
                    - generic: "-24"
                    - generic: "-18"
                    - generic: "-12"
                    - generic: "-6"
                    - generic: "0"
              - generic [ref=e1823]:
                - generic [ref=e1824]: L
                - generic [ref=e1825]: R
              - generic [ref=e1826]:
                - button "DIM" [ref=e1827]
                - button "Open audio visualizer" [ref=e1828]:
                  - img [ref=e1829]
        - separator [ref=e1830]
        - region "Timeline" [ref=e1835]:
          - generic [ref=e1837]:
            - generic [ref=e1838]:
              - button "Add track" [ref=e1839] [cursor=pointer]:
                - img
                - text: Add track
              - generic [ref=e1840]:
                - button [ref=e1841] [cursor=pointer]:
                  - img
                - button [ref=e1842] [cursor=pointer]:
                  - img
                - button [ref=e1844] [cursor=pointer]:
                  - img
                - button [ref=e1845] [cursor=pointer]:
                  - img
                - button [ref=e1847] [cursor=pointer]:
                  - img
                - button [ref=e1848] [cursor=pointer]:
                  - img
                - button [ref=e1850] [cursor=pointer]:
                  - img
                - button [disabled] [ref=e1851]:
                  - img [ref=e1852]
                - button [ref=e1858] [cursor=pointer]:
                  - img
                - button [ref=e1859] [cursor=pointer]:
                  - img
                - button [ref=e1860] [cursor=pointer]:
                  - img
                - button [ref=e1861] [cursor=pointer]:
                  - img
                - button [ref=e1862] [cursor=pointer]:
                  - img
                - button [ref=e1864] [cursor=pointer]:
                  - img
                - button [ref=e1865] [cursor=pointer]:
                  - img
                - button [ref=e1866] [cursor=pointer]:
                  - img
                - button [ref=e1867] [cursor=pointer]:
                  - img
                - button [ref=e1869] [cursor=pointer]:
                  - img
            - button "Main scene" [ref=e1871] [cursor=pointer]:
              - generic [ref=e1872]: Main scene
              - img [ref=e1874]
            - generic [ref=e1879]:
              - button [ref=e1880] [cursor=pointer]:
                - img
              - button [ref=e1881] [cursor=pointer]:
                - img
              - button [ref=e1883] [cursor=pointer]:
                - img
              - button [ref=e1884] [cursor=pointer]:
                - img
              - button [ref=e1885] [cursor=pointer]:
                - img
              - button [ref=e1887] [cursor=pointer]:
                - img
              - button [ref=e1888] [cursor=pointer]:
                - img
              - button [ref=e1889] [cursor=pointer]:
                - img
              - button [ref=e1891] [cursor=pointer]:
                - img
              - button [ref=e1893] [cursor=pointer]:
                - img
              - button [ref=e1894] [cursor=pointer]:
                - img
              - generic [ref=e1896]:
                - button "Zoom out" [ref=e1897] [cursor=pointer]:
                  - img
                - slider [ref=e1902]
                - button "Zoom in" [ref=e1903] [cursor=pointer]:
                  - img
          - generic [ref=e1904]:
            - generic [ref=e1905]:
              - button "Resize track labels column" [ref=e1906]:
                - generic:
                  - img
              - generic [ref=e1909]: Tracks
              - generic [ref=e1914]:
                - generic [ref=e1915]:
                  - generic [ref=e1916]:
                    - button "Hide track" [ref=e1917] [cursor=pointer]:
                      - img [ref=e1918]
                    - button "Change track color" [ref=e1921]
                    - generic [ref=e1922]: V1
                    - button "Main Track" [ref=e1923]
                  - button "Lock track" [ref=e1925] [cursor=pointer]:
                    - img [ref=e1926]
                - generic [ref=e1929]:
                  - generic [ref=e1930]:
                    - generic [ref=e1931]: O
                    - 'slider "Track opacity: 100%" [ref=e1932] [cursor=pointer]': "100"
                    - generic [ref=e1933]: 100%
                  - generic [ref=e1934]:
                    - generic [ref=e1935]: V
                    - 'slider "Track volume: 100%" [ref=e1936] [cursor=pointer]': "100"
                    - generic [ref=e1937]: 100%
            - generic [ref=e1939]:
              - generic [ref=e1941]:
                - slider "Timeline ruler" [ref=e1942]:
                  - generic [ref=e1943]: 00:00:00:00
                  - generic [ref=e1948]: 00:00:00:15
                  - generic [ref=e1953]: 00:00:01:00
                  - generic [ref=e1958]: 00:00:01:15
                  - generic [ref=e1963]: 00:00:02:00
                  - generic [ref=e1968]: 00:00:02:15
                  - generic [ref=e1973]: 00:00:03:00
                  - generic [ref=e1978]: 00:00:03:15
                - generic "Timeline ruler" [ref=e1983]
              - generic [ref=e1987]:
                - generic [ref=e1988]:
                  - button "Select Main Track track" [ref=e1989]
                  - generic [ref=e1990]:
                    - generic: Drop media
                - button "Resize track height" [ref=e1991]
              - slider "Timeline playhead":
                - button "Drag playhead" [ref=e1993]
    - generic [ref=e1994]:
      - generic "Total time you have been working on this project." [ref=e1996]:
        - generic [ref=e1997]: Worked on
        - generic [ref=e1998]: 00:00:10
      - generic [ref=e1999]:
        - generic [ref=e2000]: 1080p
        - generic [ref=e2001]: •
        - generic [ref=e2002]: 30 fps
        - generic [ref=e2003]: •
        - generic [ref=e2004]: 16:9
        - generic [ref=e2005]: •
        - generic [ref=e2006]: Stereo
```

# Test source

```ts
  62  | 		await bootEditor(page);
  63  | 		const tabsToVisit: RegExp[] = [
  64  | 			/^Assets$/i,
  65  | 			/^Text$/i,
  66  | 			/^Elements$/i,
  67  | 			/^Transitions$/i,
  68  | 			/^Effects$/i,
  69  | 			/^Overlays$/i,
  70  | 			/^Audio$/i,
  71  | 			/^Motion$/i,
  72  | 			/^Adjust$/i,
  73  | 			/^Templates$/i,
  74  | 			/^Preset Tools$/i,
  75  | 			/^Tools$/i,
  76  | 			/^Color$/i,
  77  | 			/^Plugins$/i,
  78  | 		];
  79  | 
  80  | 		for (const label of tabsToVisit) {
  81  | 			await clickAssetTab(page, label);
  82  | 			const text = await page.locator("body").innerText();
  83  | 			expect(text.length, `Tab ${label} body text`).toBeGreaterThan(100);
  84  | 		}
  85  | 
  86  | 		expect(errors, "no fatal errors while clicking tabs").toEqual([]);
  87  | 	});
  88  | 
  89  | 	test("Adjust panel renders adjustment controls, not video controls", async ({
  90  | 		page,
  91  | 	}) => {
  92  | 		await bootEditor(page);
  93  | 		await clickAssetTab(page, /^Adjust$/i);
  94  | 		await page.waitForTimeout(800);
  95  | 		const text = await page.locator("body").innerText();
  96  | 		// Should show adjustment category labels — not video / transform
  97  | 		// tabs (those live in the inspector, not in the Adjust panel).
  98  | 		expect(text).toMatch(/Basic|Color|Effects/i);
  99  | 		// Body must be non-trivial.
  100 | 		expect(text.length).toBeGreaterThan(200);
  101 | 	});
  102 | 
  103 | 	test("Effects panel renders many distinct cards (not 1 repeated)", async ({
  104 | 		page,
  105 | 	}) => {
  106 | 		await bootEditor(page);
  107 | 		await clickAssetTab(page, /^Effects$/i);
  108 | 		// Wait for the effect grid to settle — IO gating means cards
  109 | 		// render lazily so we need a beat.
  110 | 		await page.waitForTimeout(2_500);
  111 | 		const cards = page.locator('[draggable="true"]');
  112 | 		const count = await cards.count();
  113 | 		expect(
  114 | 			count,
  115 | 			"Effects panel should expose many distinct cards (>=30)",
  116 | 		).toBeGreaterThan(30);
  117 | 	});
  118 | 
  119 | 	test("long effect preset names render via MarqueeText", async ({
  120 | 		page,
  121 | 	}) => {
  122 | 		await bootEditor(page);
  123 | 		await clickAssetTab(page, /^Effects$/i);
  124 | 		await page.waitForTimeout(2_500);
  125 | 		// The marquee text component renders a hidden overflow track,
  126 | 		// so any element with `overflow: hidden` *and* a wider child
  127 | 		// proves the marquee mechanism is in use. Effects with long
  128 | 		// names (e.g. "Chroma Key", "Kaleidoscope") are tagged for
  129 | 		// marquee rendering.
  130 | 		const overflowing = await page.evaluate(() => {
  131 | 			const containers = Array.from(
  132 | 				document.querySelectorAll<HTMLElement>('[class*="overflow-hidden"]'),
  133 | 			);
  134 | 			return containers
  135 | 				.filter((el) => {
  136 | 					const child = el.firstElementChild as HTMLElement | null;
  137 | 					if (!child) return false;
  138 | 					return child.scrollWidth > el.clientWidth;
  139 | 				})
  140 | 				.slice(0, 5)
  141 | 				.map((el) => ({
  142 | 					scrollWidth: el.scrollWidth,
  143 | 					clientWidth: el.clientWidth,
  144 | 					text: (el.textContent ?? "").trim().slice(0, 50),
  145 | 				}));
  146 | 		});
  147 | 		expect(
  148 | 			overflowing.length,
  149 | 			"At least some Effects cards should have marquee-running text (scrollWidth > clientWidth)",
  150 | 		).toBeGreaterThan(0);
  151 | 	});
  152 | 
  153 | 	test("Transitions panel renders many distinct cards", async ({ page }) => {
  154 | 		await bootEditor(page);
  155 | 		await clickAssetTab(page, /^Transitions$/i);
  156 | 		await page.waitForTimeout(2_500);
  157 | 		const cards = page.locator('[draggable="true"]');
  158 | 		const count = await cards.count();
  159 | 		expect(
  160 | 			count,
  161 | 			"Transitions panel should expose many distinct cards (>=20)",
> 162 | 		).toBeGreaterThan(20);
      |     ^ Error: Transitions panel should expose many distinct cards (>=20)
  163 | 	});
  164 | 
  165 | 	test("Color tab is reachable from the left bar", async ({ page }) => {
  166 | 		await bootEditor(page);
  167 | 		await clickAssetTab(page, /^Color$/i);
  168 | 		await page.waitForTimeout(800);
  169 | 		const text = await page.locator("body").innerText();
  170 | 		expect(text.length).toBeGreaterThan(50);
  171 | 	});
  172 | 
  173 | 	test("AI Edit tab is gated (Coming Soon) but the DOM exists", async ({
  174 | 		page,
  175 | 	}) => {
  176 | 		await bootEditor(page);
  177 | 		const aiTab = page.getByRole("button", { name: /AI Edit/i }).first();
  178 | 		await expect(aiTab).toBeVisible();
  179 | 		const ariaDisabled = await aiTab.getAttribute("aria-disabled");
  180 | 		const classAttr = (await aiTab.getAttribute("class")) ?? "";
  181 | 		const isDimmed = /opacity-40|cursor-not-allowed/.test(classAttr);
  182 | 		expect(
  183 | 			ariaDisabled === "true" || isDimmed,
  184 | 			"AI Edit tab should be visibly disabled while feature flag is off",
  185 | 		).toBeTruthy();
  186 | 	});
  187 | 
  188 | 	test("inspector shows Element summary when a text element is selected", async ({
  189 | 		page,
  190 | 	}) => {
  191 | 		await bootEditor(page);
  192 | 		// Insert a text element and select it.
  193 | 		const { insertAndSelectText } = await import("./helpers");
  194 | 		await insertAndSelectText(page, { content: "Inspector smoke" });
  195 | 		await page.waitForTimeout(800);
  196 | 		// The inspector should now be visible with a tab strip and a
  197 | 		// "Text" tab (since the element is a text element).
  198 | 		const textTab = page
  199 | 			.locator('[role="tablist"] button, [role="tab"]')
  200 | 			.filter({ hasText: /^Text$/i })
  201 | 			.first();
  202 | 		await expect(textTab).toBeVisible({ timeout: 10_000 });
  203 | 	});
  204 | 
  205 | 	test("Text element inspector does NOT show Transform / Speed / Audio tabs", async ({
  206 | 		page,
  207 | 	}) => {
  208 | 		const { insertAndSelectText } = await import("./helpers");
  209 | 		await bootEditor(page);
  210 | 		await insertAndSelectText(page, { content: "Text only" });
  211 | 		await page.waitForTimeout(500);
  212 | 		// Tabs that should NOT appear for a plain text element.
  213 | 		for (const forbidden of [/^Speed$/i, /^Speed Ramp$/i, /^Audio$/i]) {
  214 | 			const tab = page
  215 | 				.locator('[role="tablist"] button, [role="tab"]')
  216 | 				.filter({ hasText: forbidden })
  217 | 				.first();
  218 | 			const visible = await tab.isVisible({ timeout: 500 }).catch(() => false);
  219 | 			expect(visible, `Text inspector should not show tab ${forbidden}`).toBe(
  220 | 				false,
  221 | 			);
  222 | 		}
  223 | 	});
  224 | });
  225 | 
```