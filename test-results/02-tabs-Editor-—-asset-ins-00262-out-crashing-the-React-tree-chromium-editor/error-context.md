# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-tabs.spec.ts >> Editor — asset & inspector tabs >> every asset tab opens without crashing the React tree
- Location: tests\02-tabs.spec.ts:58:6

# Error details

```
TimeoutError: locator.scrollIntoViewIfNeeded: Timeout 10000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^Preset Tools$/i }).first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - region "Notifications alt+T"
  - generic [ref=e7] [cursor=pointer]:
    - button "Open issues overlay" [ref=e8]:
      - img [ref=e10]
      - generic [ref=e12]:
        - generic [ref=e13]: "135"
        - generic [ref=e14]: "136"
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
          - button "Transitions" [ref=e70] [cursor=pointer]:
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
          - button "Templates" [active] [ref=e82] [cursor=pointer]:
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
            - generic [ref=e110]: Templates
            - generic [ref=e113]:
              - paragraph [ref=e114]: Start with a pre-built template and replace the placeholder media with your own.
              - generic [ref=e115]:
                - button "All" [ref=e116]
                - button "Intro" [ref=e117]
                - button "Outro" [ref=e118]
                - button "Lower Third" [ref=e119]
                - button "Social" [ref=e120]
                - button "Vlog" [ref=e121]
                - button "Promo" [ref=e122]
                - button "Slideshow" [ref=e123]
                - button "Lyric" [ref=e124]
                - button "Tutorial" [ref=e125]
              - generic [ref=e126]:
                - button "ZO 3s Zoom Intro" [ref=e127]:
                  - generic [ref=e128]:
                    - generic [ref=e133]: ZO
                    - generic [ref=e134]: 3s
                  - generic [ref=e137]: Zoom Intro
                  - img [ref=e138]
                - button "FA 4s Fade Outro" [ref=e140]:
                  - generic [ref=e141]:
                    - generic [ref=e148]: FA
                    - generic [ref=e149]: 4s
                  - generic [ref=e152]: Fade Outro
                  - img [ref=e153]
                - button "VL 4s Vlog Intro" [ref=e155]:
                  - generic [ref=e156]:
                    - generic [ref=e163]: VL
                    - generic [ref=e164]: 4s
                  - generic [ref=e167]: Vlog Intro
                  - img [ref=e168]
                - button "TU 6s Tutorial Step" [ref=e170]:
                  - generic [ref=e171]:
                    - generic [ref=e178]: TU
                    - generic [ref=e179]: 6s
                  - generic [ref=e182]: Tutorial Step
                  - img [ref=e183]
                - button "LY 5s Lyric Card" [ref=e185]:
                  - generic [ref=e186]:
                    - generic [ref=e192]: LY
                    - generic [ref=e193]: 5s
                  - generic [ref=e196]: Lyric Card
                  - img [ref=e197]
                - button "PR 5s Promo CTA" [ref=e199]:
                  - generic [ref=e200]:
                    - generic [ref=e207]: PR
                    - generic [ref=e208]: 5s
                  - generic [ref=e211]: Promo CTA
                  - img [ref=e212]
                - button "PH 9s Photo Slideshow" [ref=e214]:
                  - generic [ref=e215]:
                    - generic [ref=e220]: PH
                    - generic [ref=e221]: 9s
                  - generic [ref=e224]: Photo Slideshow
                  - img [ref=e225]
                - button "SO 8s Social Story" [ref=e227]:
                  - generic [ref=e228]:
                    - generic [ref=e234]: SO
                    - generic [ref=e235]: 8s
                  - generic [ref=e238]: Social Story
                  - img [ref=e239]
                - button "NA 5s Name Lower Third" [ref=e241]:
                  - generic [ref=e242]:
                    - generic [ref=e249]: NA
                    - generic [ref=e250]: 5s
                  - generic [ref=e253]: Name Lower Third
                  - img [ref=e254]
                - button "BA 5s Banner Lower Third" [ref=e256]:
                  - generic [ref=e257]:
                    - generic [ref=e263]: BA
                    - generic [ref=e264]: 5s
                  - generic [ref=e266]:
                    - generic [ref=e267]: Banner Lower Third
                    - generic [ref=e268]: Banner Lower Third
                  - img [ref=e269]
                - button "TI 3s Title Slide" [ref=e271]:
                  - generic [ref=e272]:
                    - generic [ref=e278]: TI
                    - generic [ref=e279]: 3s
                  - generic [ref=e282]: Title Slide
                  - img [ref=e283]
                - button "SU 4s Subscribe Outro" [ref=e285]:
                  - generic [ref=e286]:
                    - generic [ref=e293]: SU
                    - generic [ref=e294]: 4s
                  - generic [ref=e297]: Subscribe Outro
                  - img [ref=e298]
                - button "SA 4s Sale Promo" [ref=e300]:
                  - generic [ref=e301]:
                    - generic [ref=e306]: SA
                    - generic [ref=e307]: 4s
                  - generic [ref=e310]: Sale Promo
                  - img [ref=e311]
                - button "QU 3s Quick Intro" [ref=e313]:
                  - generic [ref=e314]:
                    - generic [ref=e319]: QU
                    - generic [ref=e320]: 3s
                  - generic [ref=e323]: Quick Intro
                  - img [ref=e324]
                - button "LO 4s Logo Intro" [ref=e326]:
                  - generic [ref=e327]:
                    - generic [ref=e334]: LO
                    - generic [ref=e335]: 4s
                  - generic [ref=e338]: Logo Intro
                  - img [ref=e339]
                - button "CI 5s Cinematic Intro" [ref=e341]:
                  - generic [ref=e342]:
                    - generic [ref=e348]: CI
                    - generic [ref=e349]: 5s
                  - generic [ref=e352]: Cinematic Intro
                  - img [ref=e353]
                - button "VL 3s Vlog Intro" [ref=e355]:
                  - generic [ref=e356]:
                    - generic [ref=e361]: VL
                    - generic [ref=e362]: 3s
                  - generic [ref=e365]: Vlog Intro
                  - img [ref=e366]
                - button "CO 6s Countdown Intro" [ref=e368]:
                  - generic [ref=e369]:
                    - generic [ref=e376]: CO
                    - generic [ref=e377]: 6s
                  - generic [ref=e380]: Countdown Intro
                  - img [ref=e381]
                - button "SP 2s Splash Intro" [ref=e383]:
                  - generic [ref=e384]:
                    - generic [ref=e390]: SP
                    - generic [ref=e391]: 2s
                  - generic [ref=e394]: Splash Intro
                  - img [ref=e395]
                - button "MI 4s Minimal Intro" [ref=e397]:
                  - generic [ref=e398]:
                    - generic [ref=e403]: MI
                    - generic [ref=e404]: 4s
                  - generic [ref=e407]: Minimal Intro
                  - img [ref=e408]
                - button "TE 3s Tech Intro" [ref=e410]:
                  - generic [ref=e411]:
                    - generic [ref=e418]: TE
                    - generic [ref=e419]: 3s
                  - generic [ref=e422]: Tech Intro
                  - img [ref=e423]
                - button "RE 4s Retro Intro" [ref=e425]:
                  - generic [ref=e426]:
                    - generic [ref=e432]: RE
                    - generic [ref=e433]: 4s
                  - generic [ref=e436]: Retro Intro
                  - img [ref=e437]
                - button "NE 5s News Intro" [ref=e439]:
                  - generic [ref=e440]:
                    - generic [ref=e445]: NE
                    - generic [ref=e446]: 5s
                  - generic [ref=e449]: News Intro
                  - img [ref=e450]
                - button "SI 5s Simple Outro" [ref=e452]:
                  - generic [ref=e453]:
                    - generic [ref=e458]: SI
                    - generic [ref=e459]: 5s
                  - generic [ref=e462]: Simple Outro
                  - img [ref=e463]
                - button "SO 6s Social Outro" [ref=e465]:
                  - generic [ref=e466]:
                    - generic [ref=e472]: SO
                    - generic [ref=e473]: 6s
                  - generic [ref=e476]: Social Outro
                  - img [ref=e477]
                - button "EN 8s End Screen" [ref=e479]:
                  - generic [ref=e480]:
                    - generic [ref=e487]: EN
                    - generic [ref=e488]: 8s
                  - generic [ref=e491]: End Screen
                  - img [ref=e492]
                - button "LO 4s Logo Outro" [ref=e494]:
                  - generic [ref=e495]:
                    - generic [ref=e500]: LO
                    - generic [ref=e501]: 4s
                  - generic [ref=e504]: Logo Outro
                  - img [ref=e505]
                - button "QU 5s Quote Outro" [ref=e507]:
                  - generic [ref=e508]:
                    - generic [ref=e514]: QU
                    - generic [ref=e515]: 5s
                  - generic [ref=e518]: Quote Outro
                  - img [ref=e519]
                - button "CT 4s CTA Outro" [ref=e521]:
                  - generic [ref=e522]:
                    - generic [ref=e529]: CT
                    - generic [ref=e530]: 4s
                  - generic [ref=e533]: CTA Outro
                  - img [ref=e534]
                - button "BU 2s Bumper Outro" [ref=e536]:
                  - generic [ref=e537]:
                    - generic [ref=e542]: BU
                    - generic [ref=e543]: 2s
                  - generic [ref=e546]: Bumper Outro
                  - img [ref=e547]
                - button "FA 5s Farewell Outro" [ref=e549]:
                  - generic [ref=e550]:
                    - generic [ref=e556]: FA
                    - generic [ref=e557]: 5s
                  - generic [ref=e560]: Farewell Outro
                  - img [ref=e561]
                - button "CR 8s Credits Outro" [ref=e563]:
                  - generic [ref=e564]:
                    - generic [ref=e571]: CR
                    - generic [ref=e572]: 8s
                  - generic [ref=e575]: Credits Outro
                  - img [ref=e576]
                - button "TE 5s Tease Outro" [ref=e578]:
                  - generic [ref=e579]:
                    - generic [ref=e584]: TE
                    - generic [ref=e585]: 5s
                  - generic [ref=e588]: Tease Outro
                  - img [ref=e589]
                - button "BA 4s Basic Lower Third" [ref=e591]:
                  - generic [ref=e592]:
                    - generic [ref=e599]: BA
                    - generic [ref=e600]: 4s
                  - generic [ref=e603]: Basic Lower Third
                  - img [ref=e604]
                - button "NE 4s News Lower Third" [ref=e606]:
                  - generic [ref=e607]:
                    - generic [ref=e613]: NE
                    - generic [ref=e614]: 4s
                  - generic [ref=e617]: News Lower Third
                  - img [ref=e618]
                - button "SP 4s Sport Lower Third" [ref=e620]:
                  - generic [ref=e621]:
                    - generic [ref=e626]: SP
                    - generic [ref=e627]: 4s
                  - generic [ref=e630]: Sport Lower Third
                  - img [ref=e631]
                - button "MO 4s Modern Lower Third" [ref=e633]:
                  - generic [ref=e634]:
                    - generic [ref=e641]: MO
                    - generic [ref=e642]: 4s
                  - generic [ref=e644]:
                    - generic [ref=e645]: Modern Lower Third
                    - generic [ref=e646]: Modern Lower Third
                  - img [ref=e647]
                - button "GL 4s Glass Lower Third" [ref=e649]:
                  - generic [ref=e650]:
                    - generic [ref=e656]: GL
                    - generic [ref=e657]: 4s
                  - generic [ref=e660]: Glass Lower Third
                  - img [ref=e661]
                - button "AN 4s Animated Lower Third" [ref=e663]:
                  - generic [ref=e664]:
                    - generic [ref=e669]: AN
                    - generic [ref=e670]: 4s
                  - generic [ref=e672]:
                    - generic [ref=e673]: Animated Lower Third
                    - generic [ref=e674]: Animated Lower Third
                  - img [ref=e675]
                - button "TW 4s Two Line Lower Third" [ref=e677]:
                  - generic [ref=e678]:
                    - generic [ref=e685]: TW
                    - generic [ref=e686]: 4s
                  - generic [ref=e688]:
                    - generic [ref=e689]: Two Line Lower Third
                    - generic [ref=e690]: Two Line Lower Third
                  - img [ref=e691]
                - button "HI 4s Highlight Lower Third" [ref=e693]:
                  - generic [ref=e694]:
                    - generic [ref=e700]: HI
                    - generic [ref=e701]: 4s
                  - generic [ref=e703]:
                    - generic [ref=e704]: Highlight Lower Third
                    - generic [ref=e705]: Highlight Lower Third
                  - img [ref=e706]
                - button "SU 3s Subscribe Lower Third" [ref=e708]:
                  - generic [ref=e709]:
                    - generic [ref=e714]: SU
                    - generic [ref=e715]: 3s
                  - generic [ref=e717]:
                    - generic [ref=e718]: Subscribe Lower Third
                    - generic [ref=e719]: Subscribe Lower Third
                  - img [ref=e720]
                - button "QU 4s Quote Lower Third" [ref=e722]:
                  - generic [ref=e723]:
                    - generic [ref=e730]: QU
                    - generic [ref=e731]: 4s
                  - generic [ref=e734]: Quote Lower Third
                  - img [ref=e735]
                - button "HE 4s Hero Title" [ref=e737]:
                  - generic [ref=e738]:
                    - generic [ref=e743]: HE
                    - generic [ref=e744]: 4s
                  - generic [ref=e747]: Hero Title
                  - img [ref=e748]
                - button "SU 5s Subtitle Title" [ref=e750]:
                  - generic [ref=e751]:
                    - generic [ref=e757]: SU
                    - generic [ref=e758]: 5s
                  - generic [ref=e761]: Subtitle Title
                  - img [ref=e762]
                - button "MU 4s Multi-line Title" [ref=e764]:
                  - generic [ref=e765]:
                    - generic [ref=e772]: MU
                    - generic [ref=e773]: 4s
                  - generic [ref=e776]: Multi-line Title
                  - img [ref=e777]
                - button "TY 4s Typographic Title" [ref=e779]:
                  - generic [ref=e780]:
                    - generic [ref=e785]: TY
                    - generic [ref=e786]: 4s
                  - generic [ref=e789]: Typographic Title
                  - img [ref=e790]
                - button "ST 5s Stacked Title" [ref=e792]:
                  - generic [ref=e793]:
                    - generic [ref=e799]: ST
                    - generic [ref=e800]: 5s
                  - generic [ref=e803]: Stacked Title
                  - img [ref=e804]
                - button "BO 4s Bordered Title" [ref=e806]:
                  - generic [ref=e807]:
                    - generic [ref=e814]: BO
                    - generic [ref=e815]: 4s
                  - generic [ref=e818]: Bordered Title
                  - img [ref=e819]
                - button "VE 4s Vertical Title" [ref=e821]:
                  - generic [ref=e822]:
                    - generic [ref=e827]: VE
                    - generic [ref=e828]: 4s
                  - generic [ref=e831]: Vertical Title
                  - img [ref=e832]
                - button "GL 3s Glitch Title" [ref=e834]:
                  - generic [ref=e835]:
                    - generic [ref=e841]: GL
                    - generic [ref=e842]: 3s
                  - generic [ref=e845]: Glitch Title
                  - img [ref=e846]
                - button "OU 4s Outline Title" [ref=e848]:
                  - generic [ref=e849]:
                    - generic [ref=e856]: OU
                    - generic [ref=e857]: 4s
                  - generic [ref=e860]: Outline Title
                  - img [ref=e861]
                - button "AC 4s Accent Title" [ref=e863]:
                  - generic [ref=e864]:
                    - generic [ref=e869]: AC
                    - generic [ref=e870]: 4s
                  - generic [ref=e873]: Accent Title
                  - img [ref=e874]
                - button "BA 12s Basic Slideshow" [ref=e876]:
                  - generic [ref=e877]:
                    - generic [ref=e882]: BA
                    - generic [ref=e883]: 12s
                  - generic [ref=e886]: Basic Slideshow
                  - img [ref=e887]
                - button "KE 16s Ken Burns Slideshow" [ref=e889]:
                  - generic [ref=e890]:
                    - generic [ref=e897]: KE
                    - generic [ref=e898]: 16s
                  - generic [ref=e900]:
                    - generic [ref=e901]: Ken Burns Slideshow
                    - generic [ref=e902]: Ken Burns Slideshow
                  - img [ref=e903]
                - button "PO 10s Polaroid Slideshow" [ref=e905]:
                  - generic [ref=e906]:
                    - generic [ref=e912]: PO
                    - generic [ref=e913]: 10s
                  - generic [ref=e915]:
                    - generic [ref=e916]: Polaroid Slideshow
                    - generic [ref=e917]: Polaroid Slideshow
                  - img [ref=e918]
                - button "WE 15s Wedding Slideshow" [ref=e920]:
                  - generic [ref=e921]:
                    - generic [ref=e926]: WE
                    - generic [ref=e927]: 15s
                  - generic [ref=e929]:
                    - generic [ref=e930]: Wedding Slideshow
                    - generic [ref=e931]: Wedding Slideshow
                  - img [ref=e932]
                - button "TR 12s Travel Slideshow" [ref=e934]:
                  - generic [ref=e935]:
                    - generic [ref=e942]: TR
                    - generic [ref=e943]: 12s
                  - generic [ref=e946]: Travel Slideshow
                  - img [ref=e947]
                - button "BI 12s Birthday Slideshow" [ref=e949]:
                  - generic [ref=e950]:
                    - generic [ref=e956]: BI
                    - generic [ref=e957]: 12s
                  - generic [ref=e959]:
                    - generic [ref=e960]: Birthday Slideshow
                    - generic [ref=e961]: Birthday Slideshow
                  - img [ref=e962]
                - button "ME 20s Memorial Slideshow" [ref=e964]:
                  - generic [ref=e965]:
                    - generic [ref=e970]: ME
                    - generic [ref=e971]: 20s
                  - generic [ref=e973]:
                    - generic [ref=e974]: Memorial Slideshow
                    - generic [ref=e975]: Memorial Slideshow
                  - img [ref=e976]
                - button "PR 12s Product Slideshow" [ref=e978]:
                  - generic [ref=e979]:
                    - generic [ref=e986]: PR
                    - generic [ref=e987]: 12s
                  - generic [ref=e990]: Product Slideshow
                  - img [ref=e991]
                - button "YE 30s Year in Review" [ref=e993]:
                  - generic [ref=e994]:
                    - generic [ref=e1000]: YE
                    - generic [ref=e1001]: 30s
                  - generic [ref=e1004]: Year in Review
                  - img [ref=e1005]
                - button "TE 18s Testimonial Slideshow" [ref=e1007]:
                  - generic [ref=e1008]:
                    - generic [ref=e1013]: TE
                    - generic [ref=e1014]: 18s
                  - generic [ref=e1016]:
                    - generic [ref=e1017]: Testimonial Slideshow
                    - generic [ref=e1018]: Testimonial Slideshow
                  - img [ref=e1019]
                - button "PR 15s Product Promo" [ref=e1021]:
                  - generic [ref=e1022]:
                    - generic [ref=e1028]: PR
                    - generic [ref=e1029]: 15s
                  - generic [ref=e1032]: Product Promo
                  - img [ref=e1033]
                - button "SA 6s Sale Promo" [ref=e1035]:
                  - generic [ref=e1036]:
                    - generic [ref=e1041]: SA
                    - generic [ref=e1042]: 6s
                  - generic [ref=e1045]: Sale Promo
                  - img [ref=e1046]
                - button "AP 12s App Promo" [ref=e1048]:
                  - generic [ref=e1049]:
                    - generic [ref=e1056]: AP
                    - generic [ref=e1057]: 12s
                  - generic [ref=e1060]: App Promo
                  - img [ref=e1061]
                - button "EV 15s Event Promo" [ref=e1063]:
                  - generic [ref=e1064]:
                    - generic [ref=e1070]: EV
                    - generic [ref=e1071]: 15s
                  - generic [ref=e1074]: Event Promo
                  - img [ref=e1075]
                - button "RE 10s Restaurant Promo" [ref=e1077]:
                  - generic [ref=e1078]:
                    - generic [ref=e1083]: RE
                    - generic [ref=e1084]: 10s
                  - generic [ref=e1087]: Restaurant Promo
                  - img [ref=e1088]
                - button "FI 12s Fitness Promo" [ref=e1090]:
                  - generic [ref=e1091]:
                    - generic [ref=e1098]: FI
                    - generic [ref=e1099]: 12s
                  - generic [ref=e1102]: Fitness Promo
                  - img [ref=e1103]
                - button "FA 10s Fashion Promo" [ref=e1105]:
                  - generic [ref=e1106]:
                    - generic [ref=e1112]: FA
                    - generic [ref=e1113]: 10s
                  - generic [ref=e1116]: Fashion Promo
                  - img [ref=e1117]
                - button "TE 15s Tech Promo" [ref=e1119]:
                  - generic [ref=e1120]:
                    - generic [ref=e1125]: TE
                    - generic [ref=e1126]: 15s
                  - generic [ref=e1129]: Tech Promo
                  - img [ref=e1130]
                - button "RE 20s Real Estate Promo" [ref=e1132]:
                  - generic [ref=e1133]:
                    - generic [ref=e1140]: RE
                    - generic [ref=e1141]: 20s
                  - generic [ref=e1144]: Real Estate Promo
                  - img [ref=e1145]
                - button "CO 20s Course Promo" [ref=e1147]:
                  - generic [ref=e1148]:
                    - generic [ref=e1154]: CO
                    - generic [ref=e1155]: 20s
                  - generic [ref=e1158]: Course Promo
                  - img [ref=e1159]
                - button "IN 15s Instagram Story" [ref=e1161]:
                  - generic [ref=e1162]:
                    - generic [ref=e1167]: IN
                    - generic [ref=e1168]: 15s
                  - generic [ref=e1171]: Instagram Story
                  - img [ref=e1172]
                - button "TI 15s TikTok Vertical" [ref=e1174]:
                  - generic [ref=e1175]:
                    - generic [ref=e1181]: TI
                    - generic [ref=e1182]: 15s
                  - generic [ref=e1185]: TikTok Vertical
                  - img [ref=e1186]
                - button "TW 5s Twitter Quote" [ref=e1188]:
                  - generic [ref=e1189]:
                    - generic [ref=e1196]: TW
                    - generic [ref=e1197]: 5s
                  - generic [ref=e1200]: Twitter Quote
                  - img [ref=e1201]
                - button "YO 3s YouTube Thumbnail" [ref=e1203]:
                  - generic [ref=e1204]:
                    - generic [ref=e1209]: YO
                    - generic [ref=e1210]: 3s
                  - generic [ref=e1212]:
                    - generic [ref=e1213]: YouTube Thumbnail
                    - generic [ref=e1214]: YouTube Thumbnail
                  - img [ref=e1215]
                - button "LI 10s LinkedIn Post" [ref=e1217]:
                  - generic [ref=e1218]:
                    - generic [ref=e1224]: LI
                    - generic [ref=e1225]: 10s
                  - generic [ref=e1228]: LinkedIn Post
                  - img [ref=e1229]
                - button "PI 15s Pinterest Pin" [ref=e1231]:
                  - generic [ref=e1232]:
                    - generic [ref=e1239]: PI
                    - generic [ref=e1240]: 15s
                  - generic [ref=e1243]: Pinterest Pin
                  - img [ref=e1244]
                - button "FA 8s Facebook Cover" [ref=e1246]:
                  - generic [ref=e1247]:
                    - generic [ref=e1252]: FA
                    - generic [ref=e1253]: 8s
                  - generic [ref=e1256]: Facebook Cover
                  - img [ref=e1257]
                - button "RE 12s Reddit Post" [ref=e1259]:
                  - generic [ref=e1260]:
                    - generic [ref=e1266]: RE
                    - generic [ref=e1267]: 12s
                  - generic [ref=e1270]: Reddit Post
                  - img [ref=e1271]
                - button "SN 5s Snapchat Geofilter" [ref=e1273]:
                  - generic [ref=e1274]:
                    - generic [ref=e1281]: SN
                    - generic [ref=e1282]: 5s
                  - generic [ref=e1285]: Snapchat Geofilter
                  - img [ref=e1286]
                - button "DI 10s Discord Banner" [ref=e1288]:
                  - generic [ref=e1289]:
                    - generic [ref=e1294]: DI
                    - generic [ref=e1295]: 10s
                  - generic [ref=e1298]: Discord Banner
                  - img [ref=e1299]
                - button "ST 4s Story Intro" [ref=e1301]:
                  - generic [ref=e1302]:
                    - generic [ref=e1308]: ST
                    - generic [ref=e1309]: 4s
                  - generic [ref=e1312]: Story Intro
                  - img [ref=e1313]
                - button "ST 3s Story Chapter" [ref=e1315]:
                  - generic [ref=e1316]:
                    - generic [ref=e1323]: ST
                    - generic [ref=e1324]: 3s
                  - generic [ref=e1327]: Story Chapter
                  - img [ref=e1328]
                - button "ST 5s Story Quote" [ref=e1330]:
                  - generic [ref=e1331]:
                    - generic [ref=e1336]: ST
                    - generic [ref=e1337]: 5s
                  - generic [ref=e1340]: Story Quote
                  - img [ref=e1341]
                - button "ST 4s Story Flashback" [ref=e1343]:
                  - generic [ref=e1344]:
                    - generic [ref=e1350]: ST
                    - generic [ref=e1351]: 4s
                  - generic [ref=e1354]: Story Flashback
                  - img [ref=e1355]
                - button "ST 3s Story Time Skip" [ref=e1357]:
                  - generic [ref=e1358]:
                    - generic [ref=e1365]: ST
                    - generic [ref=e1366]: 3s
                  - generic [ref=e1369]: Story Time Skip
                  - img [ref=e1370]
                - button "ST 3s Story Climax" [ref=e1372]:
                  - generic [ref=e1373]:
                    - generic [ref=e1378]: ST
                    - generic [ref=e1379]: 3s
                  - generic [ref=e1382]: Story Climax
                  - img [ref=e1383]
                - button "ST 4s Story Resolution" [ref=e1385]:
                  - generic [ref=e1386]:
                    - generic [ref=e1392]: ST
                    - generic [ref=e1393]: 4s
                  - generic [ref=e1396]: Story Resolution
                  - img [ref=e1397]
                - button "ST 4s Story End" [ref=e1399]:
                  - generic [ref=e1400]:
                    - generic [ref=e1407]: ST
                    - generic [ref=e1408]: 4s
                  - generic [ref=e1411]: Story End
                  - img [ref=e1412]
                - button "ST 3s Story Twist" [ref=e1414]:
                  - generic [ref=e1415]:
                    - generic [ref=e1420]: ST
                    - generic [ref=e1421]: 3s
                  - generic [ref=e1424]: Story Twist
                  - img [ref=e1425]
                - button "ST 8s Story Credits" [ref=e1427]:
                  - generic [ref=e1428]:
                    - generic [ref=e1434]: ST
                    - generic [ref=e1435]: 8s
                  - generic [ref=e1438]: Story Credits
                  - img [ref=e1439]
                - button "SA 5s Save the Date" [ref=e1441]:
                  - generic [ref=e1442]:
                    - generic [ref=e1449]: SA
                    - generic [ref=e1450]: 5s
                  - generic [ref=e1453]: Save the Date
                  - img [ref=e1454]
                - button "EN 6s Engagement" [ref=e1456]:
                  - generic [ref=e1457]:
                    - generic [ref=e1463]: EN
                    - generic [ref=e1464]: 6s
                  - generic [ref=e1467]: Engagement
                  - img [ref=e1468]
                - button "WE 5s Wedding Day" [ref=e1470]:
                  - generic [ref=e1471]:
                    - generic [ref=e1476]: WE
                    - generic [ref=e1477]: 5s
                  - generic [ref=e1480]: Wedding Day
                  - img [ref=e1481]
                - button "BR 12s Bridal Party" [ref=e1483]:
                  - generic [ref=e1484]:
                    - generic [ref=e1491]: BR
                    - generic [ref=e1492]: 12s
                  - generic [ref=e1495]: Bridal Party
                  - img [ref=e1496]
                - button "RE 5s Reception" [ref=e1498]:
                  - generic [ref=e1499]:
                    - generic [ref=e1505]: RE
                    - generic [ref=e1506]: 5s
                  - generic [ref=e1509]: Reception
                  - img [ref=e1510]
                - button "TH 5s Thank You" [ref=e1512]:
                  - generic [ref=e1513]:
                    - generic [ref=e1518]: TH
                    - generic [ref=e1519]: 5s
                  - generic [ref=e1522]: Thank You
                  - img [ref=e1523]
                - button "HO 6s Honeymoon" [ref=e1525]:
                  - generic [ref=e1526]:
                    - generic [ref=e1533]: HO
                    - generic [ref=e1534]: 6s
                  - generic [ref=e1537]: Honeymoon
                  - img [ref=e1538]
                - button "LO 12s Love Story" [ref=e1540]:
                  - generic [ref=e1541]:
                    - generic [ref=e1547]: LO
                    - generic [ref=e1548]: 12s
                  - generic [ref=e1551]: Love Story
                  - img [ref=e1552]
                - button "CE 5s Ceremony" [ref=e1554]:
                  - generic [ref=e1555]:
                    - generic [ref=e1560]: CE
                    - generic [ref=e1561]: 5s
                  - generic [ref=e1564]: Ceremony
                  - img [ref=e1565]
                - button "WE 4s Wedding Memories" [ref=e1567]:
                  - generic [ref=e1568]:
                    - generic [ref=e1575]: WE
                    - generic [ref=e1576]: 4s
                  - generic [ref=e1578]:
                    - generic [ref=e1579]: Wedding Memories
                    - generic [ref=e1580]: Wedding Memories
                  - img [ref=e1581]
                - button "DE 5s Destination Intro" [ref=e1583]:
                  - generic [ref=e1584]:
                    - generic [ref=e1591]: DE
                    - generic [ref=e1592]: 5s
                  - generic [ref=e1595]: Destination Intro
                  - img [ref=e1596]
                - button "IT 5s Itinerary Day" [ref=e1598]:
                  - generic [ref=e1599]:
                    - generic [ref=e1605]: IT
                    - generic [ref=e1606]: 5s
                  - generic [ref=e1609]: Itinerary Day
                  - img [ref=e1610]
                - button "TR 5s Travel Tips" [ref=e1612]:
                  - generic [ref=e1613]:
                    - generic [ref=e1618]: TR
                    - generic [ref=e1619]: 5s
                  - generic [ref=e1622]: Travel Tips
                  - img [ref=e1623]
                - button "TR 6s Travel Map" [ref=e1625]:
                  - generic [ref=e1626]:
                    - generic [ref=e1633]: TR
                    - generic [ref=e1634]: 6s
                  - generic [ref=e1637]: Travel Map
                  - img [ref=e1638]
                - button "TR 5s Travel Memory" [ref=e1640]:
                  - generic [ref=e1641]:
                    - generic [ref=e1647]: TR
                    - generic [ref=e1648]: 5s
                  - generic [ref=e1651]: Travel Memory
                  - img [ref=e1652]
                - button "TR 12s Travel Countdown" [ref=e1654]:
                  - generic [ref=e1655]:
                    - generic [ref=e1660]: TR
                    - generic [ref=e1661]: 12s
                  - generic [ref=e1664]: Travel Countdown
                  - img [ref=e1665]
                - button "TR 5s Travel Quote" [ref=e1667]:
                  - generic [ref=e1668]:
                    - generic [ref=e1675]: TR
                    - generic [ref=e1676]: 5s
                  - generic [ref=e1679]: Travel Quote
                  - img [ref=e1680]
                - button "TR 15s Travel Highlight" [ref=e1682]:
                  - generic [ref=e1683]:
                    - generic [ref=e1689]: TR
                    - generic [ref=e1690]: 15s
                  - generic [ref=e1693]: Travel Highlight
                  - img [ref=e1694]
                - button "TR 8s Travel Stats" [ref=e1696]:
                  - generic [ref=e1697]:
                    - generic [ref=e1702]: TR
                    - generic [ref=e1703]: 8s
                  - generic [ref=e1706]: Travel Stats
                  - img [ref=e1707]
                - button "TR 4s Travel Vlog Intro" [ref=e1709]:
                  - generic [ref=e1710]:
                    - generic [ref=e1717]: TR
                    - generic [ref=e1718]: 4s
                  - generic [ref=e1721]: Travel Vlog Intro
                  - img [ref=e1722]
                - button "MA 6s Match Intro" [ref=e1724]:
                  - generic [ref=e1725]:
                    - generic [ref=e1731]: MA
                    - generic [ref=e1732]: 6s
                  - generic [ref=e1735]: Match Intro
                  - img [ref=e1736]
                - button "SC 5s Score Card" [ref=e1738]:
                  - generic [ref=e1739]:
                    - generic [ref=e1744]: SC
                    - generic [ref=e1745]: 5s
                  - generic [ref=e1748]: Score Card
                  - img [ref=e1749]
                - button "PL 4s Player Intro" [ref=e1751]:
                  - generic [ref=e1752]:
                    - generic [ref=e1759]: PL
                    - generic [ref=e1760]: 4s
                  - generic [ref=e1763]: Player Intro
                  - img [ref=e1764]
                - button "GO 3s Goal Replay" [ref=e1766]:
                  - generic [ref=e1767]:
                    - generic [ref=e1773]: GO
                    - generic [ref=e1774]: 3s
                  - generic [ref=e1777]: Goal Replay
                  - img [ref=e1778]
                - button "HA 5s Halftime Stats" [ref=e1780]:
                  - generic [ref=e1781]:
                    - generic [ref=e1786]: HA
                    - generic [ref=e1787]: 5s
                  - generic [ref=e1790]: Halftime Stats
                  - img [ref=e1791]
                - button "FI 4s Final Whistle" [ref=e1793]:
                  - generic [ref=e1794]:
                    - generic [ref=e1801]: FI
                    - generic [ref=e1802]: 4s
                  - generic [ref=e1805]: Final Whistle
                  - img [ref=e1806]
                - button "TR 10s Training Day" [ref=e1808]:
                  - generic [ref=e1809]:
                    - generic [ref=e1815]: TR
                    - generic [ref=e1816]: 10s
                  - generic [ref=e1819]: Training Day
                  - img [ref=e1820]
                - button "TE 4s Team Huddle" [ref=e1822]:
                  - generic [ref=e1823]:
                    - generic [ref=e1828]: TE
                    - generic [ref=e1829]: 4s
                  - generic [ref=e1832]: Team Huddle
                  - img [ref=e1833]
                - button "MV 5s MVP Award" [ref=e1835]:
                  - generic [ref=e1836]:
                    - generic [ref=e1843]: MV
                    - generic [ref=e1844]: 5s
                  - generic [ref=e1847]: MVP Award
                  - img [ref=e1848]
                - button "SE 20s Season Recap" [ref=e1850]:
                  - generic [ref=e1851]:
                    - generic [ref=e1857]: SE
                    - generic [ref=e1858]: 20s
                  - generic [ref=e1861]: Season Recap
                  - img [ref=e1862]
                - button "AL 5s Album Cover" [ref=e1864]:
                  - generic [ref=e1865]:
                    - generic [ref=e1871]: AL
                    - generic [ref=e1872]: 5s
                  - generic [ref=e1875]: Album Cover
                  - img [ref=e1876]
                - button "LY 6s Lyric Video" [ref=e1878]:
                  - generic [ref=e1879]:
                    - generic [ref=e1884]: LY
                    - generic [ref=e1885]: 6s
                  - generic [ref=e1888]: Lyric Video
                  - img [ref=e1889]
                - button "CO 5s Concert Intro" [ref=e1891]:
                  - generic [ref=e1892]:
                    - generic [ref=e1899]: CO
                    - generic [ref=e1900]: 5s
                  - generic [ref=e1903]: Concert Intro
                  - img [ref=e1904]
                - button "MU 4s Music Video Card" [ref=e1906]:
                  - generic [ref=e1907]:
                    - generic [ref=e1913]: MU
                    - generic [ref=e1914]: 4s
                  - generic [ref=e1917]: Music Video Card
                  - img [ref=e1918]
                - button "TR 8s Tracklist" [ref=e1920]:
                  - generic [ref=e1921]:
                    - generic [ref=e1926]: TR
                    - generic [ref=e1927]: 8s
                  - generic [ref=e1930]: Tracklist
                  - img [ref=e1931]
                - button "EQ 5s Equalizer" [ref=e1933]:
                  - generic [ref=e1934]:
                    - generic [ref=e1941]: EQ
                    - generic [ref=e1942]: 5s
                  - generic [ref=e1945]: Equalizer
                  - img [ref=e1946]
                - button "VI 4s Vinyl Spin" [ref=e1948]:
                  - generic [ref=e1949]:
                    - generic [ref=e1955]: VI
                    - generic [ref=e1956]: 4s
                  - generic [ref=e1959]: Vinyl Spin
                  - img [ref=e1960]
                - button "TO 8s Tour Dates" [ref=e1962]:
                  - generic [ref=e1963]:
                    - generic [ref=e1968]: TO
                    - generic [ref=e1969]: 8s
                  - generic [ref=e1972]: Tour Dates
                  - img [ref=e1973]
                - button "BE 3s Beat Drop" [ref=e1975]:
                  - generic [ref=e1976]:
                    - generic [ref=e1983]: BE
                    - generic [ref=e1984]: 3s
                  - generic [ref=e1987]: Beat Drop
                  - img [ref=e1988]
                - button "MU 5s Music Stream" [ref=e1990]:
                  - generic [ref=e1991]:
                    - generic [ref=e1997]: MU
                    - generic [ref=e1998]: 5s
                  - generic [ref=e2001]: Music Stream
                  - img [ref=e2002]
                - button "CO 5s Corporate Intro" [ref=e2004]:
                  - generic [ref=e2005]:
                    - generic [ref=e2012]: CO
                    - generic [ref=e2013]: 5s
                  - generic [ref=e2016]: Corporate Intro
                  - img [ref=e2017]
                - button "PI 30s Pitch Deck" [ref=e2019]:
                  - generic [ref=e2020]:
                    - generic [ref=e2025]: PI
                    - generic [ref=e2026]: 30s
                  - generic [ref=e2029]: Pitch Deck
                  - img [ref=e2030]
                - button "QU 5s Quarterly Report" [ref=e2032]:
                  - generic [ref=e2033]:
                    - generic [ref=e2039]: QU
                    - generic [ref=e2040]: 5s
                  - generic [ref=e2043]: Quarterly Report
                  - img [ref=e2044]
                - button "IN 6s Investor Pitch" [ref=e2046]:
                  - generic [ref=e2047]:
                    - generic [ref=e2054]: IN
                    - generic [ref=e2055]: 6s
                  - generic [ref=e2058]: Investor Pitch
                  - img [ref=e2059]
                - button "TE 8s Team Intro" [ref=e2061]:
                  - generic [ref=e2062]:
                    - generic [ref=e2067]: TE
                    - generic [ref=e2068]: 8s
                  - generic [ref=e2071]: Team Intro
                  - img [ref=e2072]
                - button "CA 5s Case Study" [ref=e2074]:
                  - generic [ref=e2075]:
                    - generic [ref=e2081]: CA
                    - generic [ref=e2082]: 5s
                  - generic [ref=e2085]: Case Study
                  - img [ref=e2086]
                - button "PR 5s Product Demo" [ref=e2088]:
                  - generic [ref=e2089]:
                    - generic [ref=e2096]: PR
                    - generic [ref=e2097]: 5s
                  - generic [ref=e2100]: Product Demo
                  - img [ref=e2101]
                - button "TE 5s Testimonial Card" [ref=e2103]:
                  - generic [ref=e2104]:
                    - generic [ref=e2109]: TE
                    - generic [ref=e2110]: 5s
                  - generic [ref=e2113]: Testimonial Card
                  - img [ref=e2114]
                - button "HI 6s Hiring Ad" [ref=e2116]:
                  - generic [ref=e2117]:
                    - generic [ref=e2123]: HI
                    - generic [ref=e2124]: 6s
                  - generic [ref=e2127]: Hiring Ad
                  - img [ref=e2128]
                - button "AN 5s Annual Report" [ref=e2130]:
                  - generic [ref=e2131]:
                    - generic [ref=e2138]: AN
                    - generic [ref=e2139]: 5s
                  - generic [ref=e2142]: Annual Report
                  - img [ref=e2143]
                - button "TU 4s Tutorial Intro" [ref=e2145]:
                  - generic [ref=e2146]:
                    - generic [ref=e2152]: TU
                    - generic [ref=e2153]: 4s
                  - generic [ref=e2156]: Tutorial Intro
                  - img [ref=e2157]
                - button "ST 4s Step Indicator" [ref=e2159]:
                  - generic [ref=e2160]:
                    - generic [ref=e2167]: ST
                    - generic [ref=e2168]: 4s
                  - generic [ref=e2171]: Step Indicator
                  - img [ref=e2172]
                - button "CO 5s Code Tutorial" [ref=e2174]:
                  - generic [ref=e2175]:
                    - generic [ref=e2180]: CO
                    - generic [ref=e2181]: 5s
                  - generic [ref=e2184]: Code Tutorial
                  - img [ref=e2185]
                - button "TI 4s Tip Card" [ref=e2187]:
                  - generic [ref=e2188]:
                    - generic [ref=e2194]: TI
                    - generic [ref=e2195]: 4s
                  - generic [ref=e2198]: Tip Card
                  - img [ref=e2199]
                - button "WA 4s Warning Card" [ref=e2201]:
                  - generic [ref=e2202]:
                    - generic [ref=e2209]: WA
                    - generic [ref=e2210]: 4s
                  - generic [ref=e2213]: Warning Card
                  - img [ref=e2214]
                - button "CH 6s Checklist" [ref=e2216]:
                  - generic [ref=e2217]:
                    - generic [ref=e2222]: CH
                    - generic [ref=e2223]: 6s
                  - generic [ref=e2226]: Checklist
                  - img [ref=e2227]
                - button "SU 5s Summary Card" [ref=e2229]:
                  - generic [ref=e2230]:
                    - generic [ref=e2236]: SU
                    - generic [ref=e2237]: 5s
                  - generic [ref=e2240]: Summary Card
                  - img [ref=e2241]
                - button "NE 4s Next Lesson" [ref=e2243]:
                  - generic [ref=e2244]:
                    - generic [ref=e2251]: NE
                    - generic [ref=e2252]: 4s
                  - generic [ref=e2255]: Next Lesson
                  - img [ref=e2256]
                - button "SU 5s Subscribe CTA" [ref=e2258]:
                  - generic [ref=e2259]:
                    - generic [ref=e2264]: SU
                    - generic [ref=e2265]: 5s
                  - generic [ref=e2268]: Subscribe CTA
                  - img [ref=e2269]
                - button "CO 5s Course Complete" [ref=e2271]:
                  - generic [ref=e2272]:
                    - generic [ref=e2278]: CO
                    - generic [ref=e2279]: 5s
                  - generic [ref=e2282]: Course Complete
                  - img [ref=e2283]
                - button "FL 5s Flash Sale" [ref=e2285]:
                  - generic [ref=e2286]:
                    - generic [ref=e2293]: FL
                    - generic [ref=e2294]: 5s
                  - generic [ref=e2297]: Flash Sale
                  - img [ref=e2298]
                - button "CO 5s Coupon Code" [ref=e2300]:
                  - generic [ref=e2301]:
                    - generic [ref=e2307]: CO
                    - generic [ref=e2308]: 5s
                  - generic [ref=e2311]: Coupon Code
                  - img [ref=e2312]
                - button "BO 5s BOGO" [ref=e2314]:
                  - generic [ref=e2315]:
                    - generic [ref=e2320]: BO
                    - generic [ref=e2321]: 5s
                  - generic [ref=e2324]: BOGO
                  - img [ref=e2325]
                - button "LI 4s Limited Time" [ref=e2327]:
                  - generic [ref=e2328]:
                    - generic [ref=e2335]: LI
                    - generic [ref=e2336]: 4s
                  - generic [ref=e2339]: Limited Time
                  - img [ref=e2340]
                - button "SE 6s Season Sale" [ref=e2342]:
                  - generic [ref=e2343]:
                    - generic [ref=e2349]: SE
                    - generic [ref=e2350]: 6s
                  - generic [ref=e2353]: Season Sale
                  - img [ref=e2354]
                - button "FR 3s Free Shipping" [ref=e2356]:
                  - generic [ref=e2357]:
                    - generic [ref=e2362]: FR
                    - generic [ref=e2363]: 3s
                  - generic [ref=e2366]: Free Shipping
                  - img [ref=e2367]
                - button "CL 4s Clearance" [ref=e2369]:
                  - generic [ref=e2370]:
                    - generic [ref=e2377]: CL
                    - generic [ref=e2378]: 4s
                  - generic [ref=e2381]: Clearance
                  - img [ref=e2382]
                - button "BU 5s Bundle Deal" [ref=e2384]:
                  - generic [ref=e2385]:
                    - generic [ref=e2391]: BU
                    - generic [ref=e2392]: 5s
                  - generic [ref=e2395]: Bundle Deal
                  - img [ref=e2396]
                - button "EA 4s Early Bird" [ref=e2398]:
                  - generic [ref=e2399]:
                    - generic [ref=e2404]: EA
                    - generic [ref=e2405]: 4s
                  - generic [ref=e2408]: Early Bird
                  - img [ref=e2409]
                - button "SA 5s Sale Countdown" [ref=e2411]:
                  - generic [ref=e2412]:
                    - generic [ref=e2419]: SA
                    - generic [ref=e2420]: 5s
                  - generic [ref=e2423]: Sale Countdown
                  - img [ref=e2424]
          - separator [ref=e2426]
          - generic [ref=e2430]:
            - generic [ref=e2432]:
              - generic [ref=e2433]:
                - button "Fit" [ref=e2434]
                - button "16:9" [ref=e2435]
                - button "Fullscreen preview" [ref=e2436]:
                  - img [ref=e2437]
                - button "More preview tools" [ref=e2439]:
                  - img [ref=e2440]
              - application "Preview canvas" [ref=e2446]
            - generic [ref=e2447]:
              - generic [ref=e2448]:
                - button "Show audio visualizer" [ref=e2449] [cursor=pointer]
                - button "00:00:00:00" [ref=e2457] [cursor=pointer]
                - generic [ref=e2458]: /
                - generic [ref=e2459]: 00:00:00:00
              - generic [ref=e2460]:
                - button "Go to start" [ref=e2461] [cursor=pointer]:
                  - img
                - button "Jump backward (or previous bookmark)" [ref=e2462] [cursor=pointer]:
                  - img
                - button "Play" [ref=e2463] [cursor=pointer]:
                  - img
                - button "Jump forward (or next bookmark)" [ref=e2464] [cursor=pointer]:
                  - img
                - button "Go to end" [ref=e2465] [cursor=pointer]:
                  - img
              - generic [ref=e2466]:
                - button "Enable loop playback" [ref=e2467] [cursor=pointer]:
                  - img
                - generic [ref=e2468]:
                  - button "Freehand draw" [ref=e2469] [cursor=pointer]:
                    - img
                  - button "Vector draw" [ref=e2470] [cursor=pointer]:
                    - img
                - button [ref=e2471] [cursor=pointer]:
                  - img
          - separator [ref=e2472]
          - generic [ref=e2475]:
            - generic [ref=e2478]:
              - generic [ref=e2480]:
                - generic [ref=e2481]: Details
                - button "Reset all" [ref=e2482]
              - generic [ref=e2484]:
                - generic [ref=e2485]:
                  - generic [ref=e2486]:
                    - img [ref=e2487]
                    - button "Regenerate thumbnail from first frame" [ref=e2489]:
                      - img [ref=e2490]
                  - generic [ref=e2493]:
                    - generic "Untitled Project" [ref=e2494]
                    - button "Reset all" [ref=e2495]
                  - generic [ref=e2497]: Project
                  - button "View full project info" [ref=e2498]
                - generic [ref=e2499]:
                  - generic [ref=e2500]:
                    - img [ref=e2501]
                    - generic [ref=e2504]: Project
                  - generic [ref=e2505]:
                    - generic [ref=e2506]:
                      - term [ref=e2507]: Duration
                      - definition [ref=e2508]: 0:00
                    - generic [ref=e2509]:
                      - term [ref=e2510]: Frame rate
                      - definition [ref=e2511]:
                        - generic [ref=e2512]:
                          - generic [ref=e2513]: "30"
                          - generic [ref=e2514]: fps
                    - generic [ref=e2515]:
                      - term [ref=e2516]: Resolution
                      - definition [ref=e2517]: 1920 × 1080
                    - generic [ref=e2518]:
                      - term [ref=e2519]: Background
                      - definition [ref=e2520]: Solid color
                - generic [ref=e2521]:
                  - generic [ref=e2522]:
                    - img [ref=e2523]
                    - generic [ref=e2527]: Activity
                  - generic [ref=e2528]:
                    - generic [ref=e2529]:
                      - term [ref=e2530]: Created
                      - definition [ref=e2531]: Jun 18, 2026
                    - generic [ref=e2532]:
                      - term [ref=e2533]: Modified
                      - definition [ref=e2534]: Jun 18, 2026
                    - generic [ref=e2535]:
                      - term [ref=e2536]: Project ID
                      - definition [ref=e2537]:
                        - generic [ref=e2538]:
                          - code [ref=e2539]: 5310189f
                          - button "Copy project ID" [ref=e2540]:
                            - img [ref=e2541]
            - generic [ref=e2544]:
              - button "Resize audio meter" [ref=e2545]
              - generic [ref=e2546]:
                - generic [ref=e2547]:
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
                - generic [ref=e2548]:
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
              - generic [ref=e2549]:
                - generic [ref=e2550]: L
                - generic [ref=e2551]: R
              - generic [ref=e2552]:
                - button "DIM" [ref=e2553]
                - button "Open audio visualizer" [ref=e2554]:
                  - img [ref=e2555]
        - separator [ref=e2556]
        - region "Timeline" [ref=e2561]:
          - generic [ref=e2563]:
            - generic [ref=e2564]:
              - button "Add track" [ref=e2565] [cursor=pointer]:
                - img
                - text: Add track
              - generic [ref=e2566]:
                - button [ref=e2567] [cursor=pointer]:
                  - img
                - button [ref=e2568] [cursor=pointer]:
                  - img
                - button [ref=e2570] [cursor=pointer]:
                  - img
                - button [ref=e2571] [cursor=pointer]:
                  - img
                - button [ref=e2573] [cursor=pointer]:
                  - img
                - button [ref=e2574] [cursor=pointer]:
                  - img
                - button [ref=e2576] [cursor=pointer]:
                  - img
                - button [disabled] [ref=e2577]:
                  - img [ref=e2578]
                - button [ref=e2584] [cursor=pointer]:
                  - img
                - button [ref=e2585] [cursor=pointer]:
                  - img
                - button [ref=e2586] [cursor=pointer]:
                  - img
                - button [ref=e2587] [cursor=pointer]:
                  - img
                - button [ref=e2588] [cursor=pointer]:
                  - img
                - button [ref=e2590] [cursor=pointer]:
                  - img
                - button [ref=e2591] [cursor=pointer]:
                  - img
                - button [ref=e2592] [cursor=pointer]:
                  - img
                - button [ref=e2593] [cursor=pointer]:
                  - img
                - button [ref=e2595] [cursor=pointer]:
                  - img
            - button "Main scene" [ref=e2597] [cursor=pointer]:
              - generic [ref=e2598]: Main scene
              - img [ref=e2600]
            - generic [ref=e2605]:
              - button [ref=e2606] [cursor=pointer]:
                - img
              - button [ref=e2607] [cursor=pointer]:
                - img
              - button [ref=e2609] [cursor=pointer]:
                - img
              - button [ref=e2610] [cursor=pointer]:
                - img
              - button [ref=e2611] [cursor=pointer]:
                - img
              - button [ref=e2613] [cursor=pointer]:
                - img
              - button [ref=e2614] [cursor=pointer]:
                - img
              - button [ref=e2615] [cursor=pointer]:
                - img
              - button [ref=e2617] [cursor=pointer]:
                - img
              - button [ref=e2619] [cursor=pointer]:
                - img
              - button [ref=e2620] [cursor=pointer]:
                - img
              - generic [ref=e2622]:
                - button "Zoom out" [ref=e2623] [cursor=pointer]:
                  - img
                - slider [ref=e2628]
                - button "Zoom in" [ref=e2629] [cursor=pointer]:
                  - img
          - generic [ref=e2630]:
            - generic [ref=e2631]:
              - button "Resize track labels column" [ref=e2632]:
                - generic:
                  - img
              - generic [ref=e2635]: Tracks
              - generic [ref=e2640]:
                - generic [ref=e2641]:
                  - generic [ref=e2642]:
                    - button "Hide track" [ref=e2643] [cursor=pointer]:
                      - img [ref=e2644]
                    - button "Change track color" [ref=e2647]
                    - generic [ref=e2648]: V1
                    - button "Main Track" [ref=e2649]
                  - button "Lock track" [ref=e2651] [cursor=pointer]:
                    - img [ref=e2652]
                - generic [ref=e2655]:
                  - generic [ref=e2656]:
                    - generic [ref=e2657]: O
                    - 'slider "Track opacity: 100%" [ref=e2658] [cursor=pointer]': "100"
                    - generic [ref=e2659]: 100%
                  - generic [ref=e2660]:
                    - generic [ref=e2661]: V
                    - 'slider "Track volume: 100%" [ref=e2662] [cursor=pointer]': "100"
                    - generic [ref=e2663]: 100%
            - generic [ref=e2665]:
              - generic [ref=e2667]:
                - slider "Timeline ruler" [ref=e2668]:
                  - generic [ref=e2669]: 00:00:00:00
                  - generic [ref=e2674]: 00:00:00:15
                  - generic [ref=e2679]: 00:00:01:00
                  - generic [ref=e2684]: 00:00:01:15
                  - generic [ref=e2689]: 00:00:02:00
                  - generic [ref=e2694]: 00:00:02:15
                  - generic [ref=e2699]: 00:00:03:00
                  - generic [ref=e2704]: 00:00:03:15
                - generic "Timeline ruler" [ref=e2709]
              - generic [ref=e2713]:
                - generic [ref=e2714]:
                  - button "Select Main Track track" [ref=e2715]
                  - generic [ref=e2716]:
                    - generic: Drop media
                - button "Resize track height" [ref=e2717]
              - slider "Timeline playhead":
                - button "Drag playhead" [ref=e2719]
    - generic [ref=e2720]:
      - generic "Total time you have been working on this project." [ref=e2722]:
        - generic [ref=e2723]: Worked on
        - generic [ref=e2724]: 00:00:38
      - generic [ref=e2725]:
        - generic [ref=e2726]: 1080p
        - generic [ref=e2727]: •
        - generic [ref=e2728]: 30 fps
        - generic [ref=e2729]: •
        - generic [ref=e2730]: 16:9
        - generic [ref=e2731]: •
        - generic [ref=e2732]: Stereo
```

# Test source

```ts
  1   | /**
  2   |  * Shared helpers for the Artidor editor end-to-end suite.
  3   |  *
  4   |  * The editor exposes a stable, framework-free command API on
  5   |  * `window.__ARTIDOR_API__` (see `apps/web/src/lib/api/editor-api.ts`)
  6   |  * and a dev-only read-only state snapshot on `window.__ARTIDOR_DEBUG__`.
  7   |  * Tests use both: the public API to drive actions, the debug handle
  8   |  * to assert on what the timeline now contains.
  9   |  */
  10  | import { expect, type Page } from "@playwright/test";
  11  | 
  12  | export type DebugState = {
  13  | 	activeSceneId: string | null;
  14  | 	tracks: {
  15  | 		main: { id: string; name: string; elementCount: number };
  16  | 		overlay: Array<{ id: string; name: string; elementCount: number }>;
  17  | 		audio: Array<{ id: string; name: string; elementCount: number }>;
  18  | 	} | null;
  19  | 	elements: Array<{
  20  | 		id: string;
  21  | 		trackId: string;
  22  | 		type: string;
  23  | 		name: string;
  24  | 	}>;
  25  | };
  26  | 
  27  | /**
  28  |  * Open the editor at a fake project id and wait for the dark theme +
  29  |  * "Artidor" branding to mount. The editor auto-creates an "Untitled
  30  |  * Project" on first load so we don't need a database fixture.
  31  |  *
  32  |  * Also dismisses the onboarding dialog that pops on first visit
  33  |  * (otherwise its z-250 backdrop intercepts pointer events on every
  34  |  * subsequent click).
  35  |  */
  36  | export async function bootEditor(page: Page): Promise<void> {
  37  | 	await page.goto("/editor/test-project", { waitUntil: "domcontentloaded" });
  38  | 	await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 30_000 });
  39  | 	await expect(page.getByText(/Artidor/i).first()).toBeVisible({
  40  | 		timeout: 30_000,
  41  | 	});
  42  | 	// Let the React tree finish initial effects + lazy chunks.
  43  | 	await page.waitForTimeout(1_500);
  44  | 
  45  | 	// Dismiss the onboarding modal if it's open. The dialog has a
  46  | 	// `Next` button on step 0 and a `Close` button on later steps.
  47  | 	for (let attempt = 0; attempt < 6; attempt++) {
  48  | 		const closeBtn = page.getByRole("button", { name: /^Close$/i }).first();
  49  | 		if (await closeBtn.isVisible({ timeout: 200 }).catch(() => false)) {
  50  | 			await closeBtn.click().catch(() => undefined);
  51  | 			await page.waitForTimeout(200);
  52  | 			continue;
  53  | 		}
  54  | 		const nextBtn = page.getByRole("button", { name: /^Next$/i }).first();
  55  | 		if (await nextBtn.isVisible({ timeout: 200 }).catch(() => false)) {
  56  | 			await nextBtn.click().catch(() => undefined);
  57  | 			await page.waitForTimeout(200);
  58  | 			continue;
  59  | 		}
  60  | 		break;
  61  | 	}
  62  | 
  63  | 	// Wait for both the public API and the dev-only debug handle to
  64  | 	// be available. EditorCore attaches both during its constructor
  65  | 	// run, but only after EditorProvider mounts and runs it. Poll with
  66  | 	// a generous budget because cold compile on first load can take a
  67  | 	// while.
  68  | 	await expect
  69  | 		.poll(
  70  | 			async () =>
  71  | 				await page.evaluate(() => {
  72  | 					const w = window as unknown as {
  73  | 						__ARTIDOR_API__?: unknown;
  74  | 						__ARTIDOR_DEBUG__?: unknown;
  75  | 					};
  76  | 					return Boolean(w.__ARTIDOR_API__ && w.__ARTIDOR_DEBUG__);
  77  | 				}),
  78  | 			{ timeout: 30_000, intervals: [500] },
  79  | 		)
  80  | 		.toBe(true);
  81  | }
  82  | 
  83  | /**
  84  |  * Click an asset-panel tab (left bar). Asset tabs expose
  85  |  * `aria-label = display name` (e.g. "Effects"), so we use getByRole
  86  |  * for precise targeting. `force: true` skips the stability check
  87  |  * because the asset panel uses motion animations that the stability
  88  |  * heuristic sometimes flags.
  89  |  */
  90  | export async function clickAssetTab(
  91  | 	page: Page,
  92  | 	label: RegExp,
  93  | ): Promise<void> {
  94  | 	const tab = page.getByRole("button", { name: label }).first();
> 95  | 	await tab.scrollIntoViewIfNeeded({ timeout: 10_000 });
      |            ^ TimeoutError: locator.scrollIntoViewIfNeeded: Timeout 10000ms exceeded.
  96  | 	await tab.click({ force: true, timeout: 10_000 });
  97  | 	await page.waitForTimeout(500);
  98  | }
  99  | 
  100 | /** Run a command through the editor's public API. */
  101 | export async function runCommand(
  102 | 	page: Page,
  103 | 	name: string,
  104 | 	args: Record<string, unknown> = {},
  105 | ): Promise<{ ok: boolean; message?: string; data?: unknown }> {
  106 | 	return await page.evaluate(
  107 | 		async ([n, a]) => {
  108 | 			const api = (window as unknown as { __ARTIDOR_API__?: { run: typeof __ARTIDOR_API__["run"] } })
  109 | 				.__ARTIDOR_API__;
  110 | 			if (!api) throw new Error("__ARTIDOR_API__ missing");
  111 | 			return await api.run(n, a);
  112 | 		},
  113 | 		[name, args] as const,
  114 | 	);
  115 | }
  116 | 
  117 | /** Read the live editor state via the dev-only debug handle. */
  118 | export async function getEditorState(page: Page): Promise<DebugState> {
  119 | 	return await page.evaluate(() => {
  120 | 		const w = window as unknown as {
  121 | 			__ARTIDOR_DEBUG__?: { getState: () => DebugState };
  122 | 		};
  123 | 		if (!w.__ARTIDOR_DEBUG__) throw new Error("__ARTIDOR_DEBUG__ missing");
  124 | 		return w.__ARTIDOR_DEBUG__.getState();
  125 | 	});
  126 | }
  127 | 
  128 | /** Insert a text element on the timeline. Returns the new element id. */
  129 | export async function insertTextElement(
  130 | 	page: Page,
  131 | 	opts: {
  132 | 		content?: string;
  133 | 		durationSeconds?: number;
  134 | 		fontSize?: number;
  135 | 		color?: string;
  136 | 		trackId?: string;
  137 | 	} = {},
  138 | ): Promise<string> {
  139 | 	const result = await runCommand(page, "insert_text_element", {
  140 | 		content: opts.content ?? "Hello world",
  141 | 		durationSeconds: opts.durationSeconds ?? 3,
  142 | 		fontSize: opts.fontSize ?? 48,
  143 | 		color: opts.color ?? "#ffffff",
  144 | 		...(opts.trackId ? { trackId: opts.trackId } : {}),
  145 | 	});
  146 | 	expect(result.ok, `insert_text_element: ${result.message}`).toBe(true);
  147 | 	const data = result.data as { id?: string } | undefined;
  148 | 	expect(data?.id, "insert_text_element returned no id").toBeTruthy();
  149 | 	return data!.id!;
  150 | }
  151 | 
  152 | /** Select an element on the timeline by id. */
  153 | export async function selectElement(
  154 | 	page: Page,
  155 | 	trackId: string,
  156 | 	elementId: string,
  157 | ): Promise<void> {
  158 | 	const result = await runCommand(page, "select_elements", {
  159 | 		elements: [{ trackId, elementId }],
  160 | 	});
  161 | 	expect(result.ok, `select_elements: ${result.message}`).toBe(true);
  162 | }
  163 | 
  164 | /** Convenience: insert a text element and then select it. */
  165 | export async function insertAndSelectText(
  166 | 	page: Page,
  167 | 	opts: {
  168 | 		content?: string;
  169 | 		durationSeconds?: number;
  170 | 		fontSize?: number;
  171 | 		color?: string;
  172 | 	} = {},
  173 | ): Promise<{ elementId: string; trackId: string }> {
  174 | 	const elementId = await insertTextElement(page, opts);
  175 | 	const state = await getEditorState(page);
  176 | 	const element = state.elements.find((e) => e.id === elementId);
  177 | 	expect(element, `element ${elementId} not in state`).toBeTruthy();
  178 | 	await selectElement(page, element!.trackId, elementId);
  179 | 	return { elementId, trackId: element!.trackId };
  180 | }
  181 | 
  182 | /** Click an inspector / properties tab by label (e.g. "Transform"). */
  183 | export async function clickInspectorTab(
  184 | 	page: Page,
  185 | 	label: RegExp,
  186 | ): Promise<void> {
  187 | 	const tab = page.locator('[role="tablist"] button, [role="tab"]').filter({
  188 | 		hasText: label,
  189 | 	}).first();
  190 | 	await tab.scrollIntoViewIfNeeded({ timeout: 10_000 });
  191 | 	await tab.click({ force: true, timeout: 10_000 });
  192 | 	await page.waitForTimeout(400);
  193 | }
  194 | 
  195 | /** Collect every visible "page error" / fatal console error. */
```