+++
title = "It can't be that hard, can it?"
date = 2026-10-24
description = "Why I'm writing e-reader firmware from scratch in Rust, and the board I picked to do it on."
draft = false

[extra]
theme = "oxide"
project = "oxidized-ink"
backdrop = "slab"
backdrop_label = "The outline of an e-reader drawn in glowing characters, turning slowly"
+++

Ever since I got one of those small Xteink ebook readers that are small enough to stick to the back of the phone, I have a new motivation for reading. That, in turn, led me to a motivation to make an ebook reader myself - and maybe deepen my Rust knowledge trying to write firmware from scratch. It can't be that hard, can it? 🤭

In any case, I chose a refurbished Inkplate 6 from Soldered. Because I'm lazy and this thing has almost all I need, including some things I don't, like Bluetooth. It is a 6 inch, 800x600 grayscale e-paper (because why do I need color in my ebooks, this is silly), an onboard ESP32 with WiFi, plus a microSD card reader, an RTC, a whole bunch of GPIO and a battery charging circuit. They also offer 3D-printed enclosure and 1200 mAh battery bundle, but that is probably even less interesting than Bluetooth - I'll make my own, of course, and I also have a spare 4000 mAh 606090 cell. And - physical buttons instead of touch screen, that is a must!

Wish me luck!
