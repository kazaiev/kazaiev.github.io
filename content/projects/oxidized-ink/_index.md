+++
transparent = true
title = "OxidizedInk"
description = "Firmware for an e-book reader on the Inkplate 6, written in Rust."
template = "project.html"
sort_by = "date"

[extra]
theme = "oxide"
title_html = 'Oxidized<span class="accent-2">Ink</span>'
card = "img/oxidized-ink-card.png"
hero = "hero/drop.json"
still = "img/oxidized-ink-drop.png"
hero_label = "An ink drop drawn in glowing characters: the firmware's own main.rs, from #[main] fn main() at its tip to deep_sleep in the puddle below"
+++

## Roadmap

<ol class="roadmap">
<li class="done"><strong>EPUB parsing</strong><span class="status">done</span>
<p>Books are read on the device: ZIP, XHTML, and the table of contents for EPUB 2 and 3.</p></li>
<li class="done"><strong>Hardware reference</strong><span class="status">done</span>
<p>Pins, power sequencing, panel timing.</p></li>
<li class="done"><strong>Layout</strong><span class="status">done</span>
<p>Kerned, justified text set into pages. The library, the reading view, the menu, the contents, the settings.</p></li>
<li class="done"><strong>PC simulator</strong><span class="status">done</span>
<p>Either a render in a window or a screenshot generator.</p></li>
<li class="done"><strong>Inkplate firmware</strong><span class="status">done</span>
<p>The panel driver, the SD card, sleep.</p></li>
<li><strong>3D-printable case</strong>
<p>My own enclosure, with physical buttons, around the spare 4000&nbsp;mAh 606090 cell.</p></li>
<li><strong>Battery reading</strong>
<p>The charge level on screen, read from the cell's voltage.</p></li>
</ol>
