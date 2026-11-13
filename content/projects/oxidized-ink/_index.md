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

<details class="roadmap-earlier">
<summary>19 earlier steps, done</summary>
<ol class="roadmap">
<li class="done" data-n="01"><strong>EPUB parsing</strong><span class="status">done</span>
<p>Books are read on the device: ZIP, XHTML, and the table of contents for EPUB 2 and 3.</p></li>
<li class="done" data-n="02"><strong>Hardware reference</strong><span class="status">done</span>
<p>Pins, power sequencing, panel timing.</p></li>
<li class="done" data-n="03"><strong>Layout</strong><span class="status">done</span>
<p>Kerned, justified text set into pages. The library, the reading view, the menu, the contents, the settings.</p></li>
<li class="done" data-n="04"><strong>PC simulator</strong><span class="status">done</span>
<p>Either a render in a window or a screenshot generator.</p></li>
<li class="done" data-n="05"><strong>Inkplate firmware</strong><span class="status">done</span>
<p>The panel driver, the SD card, sleep.</p></li>
<li class="done" data-n="06"><strong>3D-printable case</strong><span class="status">done</span>
<p>My own enclosure, with physical buttons, around the spare 4000&nbsp;mAh 606090 cell.</p></li>
<li class="done" data-n="07"><strong>Battery calibration</strong><span class="status">done</span>
<p>Readings that match a multimeter (checked at 4.18&nbsp;V).</p></li>
<li class="done" data-n="08"><strong>Narrower button strip</strong><span class="status">done</span>
<p>9&nbsp;mm instead of 20&nbsp;mm, so the case isn't too wide.</p></li>
<li class="done" data-n="09"><strong>System info</strong><span class="status">done</span>
<p>Battery, card, free memory and firmware version, from the library and the reading menu.</p></li>
<li class="done" data-n="10"><strong>Side buttons</strong><span class="status">done</span>
<p>Prev, Next and Menu; holding Menu goes back; any button wakes the reader.</p></li>
<li class="done" data-n="11"><strong>Grayscale partial refresh</strong><span class="status">done</span>
<p>Pages turn without a flash, in 0.9&nbsp;s instead of 1.7&nbsp;s, with a full refresh every so many pages.</p></li>
<li class="done" data-n="12"><strong>Light sleep between presses</strong><span class="status">done</span>
<p>The chip sleeps 99% of the time between page turns.</p></li>
<li class="done" data-n="13"><strong>Low and empty battery screens</strong><span class="status">done</span>
<p>The reader sleeps behind a warning at 15% and 2%; the battery is always in the status line.</p></li>
<li class="done" data-n="14"><strong>Sleep screen</strong><span class="status">done</span>
<p>The book's cover, a picture from the card, or the page while asleep, with JPEG and PNG decoders written for the reader.</p></li>
<li class="done" data-n="15"><strong>Pictures in books</strong><span class="status">done</span>
<p>Illustrations with their captions; books open on their cover.</p></li>
<li class="done" data-n="16"><strong>Covers in the library</strong><span class="status">done</span>
<p>Five books a screen with cover, title, author and how much is read.</p></li>
<li class="done" data-n="17"><strong>The logo</strong><span class="status">done</span>
<p>The ink-drop logo at power-on and as a sleep screen.</p></li>
<li class="done" data-n="18"><strong>Wi-Fi transfer</strong><span class="status">done</span>
<p>Upload, download and delete books from a browser.</p></li>
<li class="done" data-n="19"><strong>Hyphenation</strong><span class="status">done</span>
<p>English and Ukrainian words broken only where a line would be loose.</p></li>
</ol>
</details>

<ol class="roadmap">
<li class="done" data-n="20"><strong>Chapter skip</strong><span class="status">done</span>
<p>Holding Next or Prev moves a chapter.</p></li>
<li class="done" data-n="21"><strong>Go to a percentage</strong><span class="status">done</span>
<p>Jump anywhere in a book from the reading menu.</p></li>
<li class="done" data-n="22"><strong>Bookmarks</strong><span class="status">done</span>
<p>Ribbon mark, bookmark list with each page's first words.</p></li>
<li class="done" data-n="23"><strong>Footnotes</strong><span class="status">done</span>
<p>Notes screen, holding Menu comes back.</p></li>
<li data-n="24"><strong>Fonts from the card</strong>
<p>Any font family, sent from the Wi-Fi page and picked under Settings.</p></li>
<li data-n="25"><strong>Updates without USB</strong>
<p>Two app slots; new firmware from the Wi-Fi page or the card, and back to the old one if it fails to start.</p></li>
<li data-n="26"><strong>Release builds</strong>
<p>The license, the changelog, tests on every pull request, and a release workflow.</p></li>
<li data-n="27"><strong>Settings on the Wi-Fi page</strong>
<p>Every setting, and the network's name and password, from a browser.</p></li>
<li data-n="28"><strong>Plain-text and Markdown books</strong>
<p><code>.txt</code> and <code>.md</code> files, with headings as chapters.</p></li>
<li data-n="29"><strong>Folders</strong>
<p>Books in folders up to three deep, on the card or made from the Wi-Fi page.</p></li>
<li data-n="30"><strong>Library order</strong>
<p>Recent, title, author or added.</p></li>
<li data-n="31"><strong>Delete book</strong>
<p>Delete the open book from the reading menu, after a confirmation.</p></li>
<li data-n="32"><strong>Book CSS</strong>
<p>The book's own alignment, emphasis, indents, spacing, hidden text and page breaks, with a setting to turn it off.</p></li>
</ol>
