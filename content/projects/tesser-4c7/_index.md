+++
transparent = true
title = "Tesser-4C7"
description = "A grid of small computers that snap together into one machine."
template = "project.html"
sort_by = "date"

[extra]
theme = "tesser"
title_html = 'Tesser-<span class="accent-2">4C7</span>'
card = "img/tesser-4c7-card.png"
backdrop = "tiles"
hero_label = "A grid of four by three tiles drawn in glowing characters, each with a few lines of code inside; pulses of green, amber and white light pass from tile to tile, and the seams flash as they cross"
+++

<p class="credit">Inspired by Zachtronics’ TIS-100, which taught a lot of us to love tiny programs.</p>

## Roadmap

<ol class="roadmap">
<li><strong>Edge test</strong>
<p>One mating wall of each kind, cut from the shell: glue in the magnets, fit the pogo pair, then snap, slide and pull.</p></li>
<li><strong>Tile print</strong>
<p>Shell, halo and lid, with corner pins to keep them in line.</p></li>
<li><strong>Simulator</strong>
<p>Write and step programs on a PC before the tiles exist.</p></li>
<li><strong>Link protocol in PIO</strong>
<p>DATA, REQ and ACK on each edge, in the Pico’s PIO, plus the STEP line.</p></li>
<li><strong>Halo LEDs</strong>
<p>The mode’s colour, and a flash on the edge a value crosses.</p></li>
<li><strong>Keyboard editor tile</strong>
<p>A tile with a keyboard, for writing code into the grid.</p></li>
<li><strong>First 2×2</strong>
<p>Four tiles running one program.</p></li>
<li><strong>3×4</strong>
<p>All twelve.</p></li>
</ol>
