Setelah ini tolong tambah 3. Keyboard-first mode

Akan ada mode keyboard-first, tapi sifatnya opt-in.

Artinya user bisa mengaktifkan mode editing yang lebih fokus ke shortcut keyboard, mirip workflow editor profesional.

Contoh kemungkinan:

cut/split pakai shortcut
pindah clip pakai keyboard
navigate timeline tanpa mouse
command palette
workflow lebih cepat untuk power user

Lalu
4. Auto caption fixes

Fitur auto caption akan diperbaiki.

Kemungkinan yang dimaksud:

hasil caption lebih akurat
timing caption lebih pas
bug caption diperbaiki
editing caption lebih nyaman
sinkronisasi caption dengan audio lebih stabil

Transitions
Efek perpindahan antar clip, misalnya fade, slide, wipe, zoom, dissolve.

Filters
Efek visual untuk clip, misalnya color filter, blur, vintage, sharpen, contrast, cinematic look, dan sejenisnya.

Renderer akan dibuat lebih cepat dan lebih stabil.

Renderer itu bagian yang menampilkan preview dan/atau melakukan export video.

Manfaatnya:

preview timeline lebih lancar
crash lebih sedikit
render/export lebih stabil
efek lebih ringan
performa lebih bagus di device berbeda

Akhirnya akan ada fitur group elements.

Artinya beberapa elemen di timeline bisa digabung jadi satu grup.

Contoh:

text + image + effect digabung
beberapa layer dipindahkan bareng
animasi beberapa object sekaligus
template scene lebih mudah dibuat

Ini penting banget buat editor video karena tanpa group, timeline cepat berantakan.

Effects library lebih besar

Artidor akan punya library efek yang jauh lebih banyak.

Ini berarti user akan punya lebih banyak pilihan efek bawaan, misalnya:

visual effects
color effects
glitch
blur
glow
grain
shadow
text effects
motion effects

Plugin system

Artidor akan punya sistem plugin.

User bisa:

install plugin dari Store
bikin plugin sendiri
publish plugin sendiri
disable built-in feature yang tidak dibutuhkan

Yang menarik: fitur bawaan dan plugin pihak ketiga akan berjalan di atas Plugin API yang sama.

Artinya fitur internal Artidor dan plugin eksternal punya akses yang konsisten ke sistem editor.

Contoh ide plugin yang disebut:

Custom snapping
Timeline bisa snap ke audio peaks, bukan cuma ke clip/marker biasa.

Cross-platform publishing
Publish langsung ke TikTok, YouTube, Instagram, dan platform lain dari dalam editor.

Silence remover
Scan audio di timeline, lalu otomatis memotong bagian diam yang lebih panjang dari threshold tertentu.

Headless mode

Ini salah satu fitur paling besar.

Headless mode berarti engine Artidor bisa berjalan tanpa UI/editor visual.

Jadi kamu bisa menjalankan Artidor lewat script atau server untuk menghasilkan video otomatis.

Contoh kegunaannya:

Batch rendering
Render 50 video sekaligus dengan template yang sama.

Template pipelines
Buat satu format/template, lalu tinggal ganti asset seperti gambar, video, teks, audio, kemudian render ulang otomatis.

Server-side rendering
Artidor bisa dipakai sebagai backend video renderer. Misalnya kamu bikin website, user klik tombol, lalu server menghasilkan video tanpa user membuka editor.

Ini membuat Artidor bukan cuma aplikasi editor, tapi juga bisa jadi video engine untuk produk lain.

Scripting tab

Artidor akan punya tab khusus untuk scripting.

Bedanya dengan plugin:

Plugin: untuk fitur permanen
Scripting tab: untuk automation sekali pakai, eksperimen, atau workflow custom

Di tab ini user bisa menulis script yang langsung berkomunikasi dengan Artidor.

Contoh kemungkinan:

auto-generate intro
susun clip otomatis
apply efek ke banyak clip sekaligus
export banyak format
ubah semua caption
buat template otomatis

MCP server

Artidor akan expose MCP server.

MCP itu Model Context Protocol, biasanya dipakai supaya AI agent bisa berinteraksi dengan aplikasi/tools.

Dengan MCP server, AI agent bisa bekerja bareng user saat editing.

Contoh kemampuan:

manipulate timeline
add clips
apply transitions
run scripts
edit project
bantu automation editing

Disebut juga akan work dengan:

Cursor
Claude
client lain yang support MCP

Jadi nanti AI agent bisa “mengontrol” Artidor lewat API resmi, bukan cuma kasih saran teks.

1. Editor API
Artidor akan punya public Editor API.

Maksudnya semua hal yang bisa dilakukan di editor, bisa juga dilakukan lewat API.

Ini membuka kemungkinan:

bikin plugin
bikin automation
bikin script
bikin produk di atas Artidor
integrasi dengan app lain
server-side video generation
AI editing workflows

Ini fitur penting karena Artidor berubah dari sekadar aplikasi editor menjadi platform video editing engine.

1. Built-in features bisa dimatikan

Karena fitur bawaan juga berjalan lewat Plugin API, user bisa disable built-in feature yang tidak dibutuhkan.

Ini bikin Artidor lebih modular.

Contoh:

nggak butuh captions → disable
nggak butuh publishing → disable
nggak butuh AI tools → disable
mau pakai plugin alternatif → bisa
15. Development terbuka

Mereka bilang pembangunan dilakukan secara open.

User bisa:

lihat progress
tanya-tanya
follow tracking issue di GitHub
dapat sneak peek
dapat early build lewat Discord
