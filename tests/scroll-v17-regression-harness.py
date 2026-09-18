#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any

from playwright.sync_api import sync_playwright

EXPECTED_BLOB = "24a7b159f7b6315dabcc016ab3af9a9b39339315"
VIEWPORTS = {
    "desktop_1440x900": (1440, 900),
    "mobile_390x844": (390, 844),
}
TOL = 1.1
TOUCH_TOL = 1.1


def git_blob_sha(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode())
    h.update(data)
    return h.hexdigest()


def check(cond: bool, label: str, details: dict[str, Any] | None = None) -> None:
    if not cond:
        suffix = f" :: {json.dumps(details, ensure_ascii=False, sort_keys=True)}" if details else ""
        raise AssertionError(label + suffix)


def rect(page, selector: str, index: int = 0) -> dict[str, float]:
    return page.eval_on_selector_all(
        selector,
        """(els, i) => {
          const r = els[i].getBoundingClientRect();
          return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};
        }""",
        index,
    )


def doc_top(page, selector: str, index: int) -> float:
    return page.eval_on_selector_all(
        selector,
        "(els, i) => els[i].getBoundingClientRect().top + window.scrollY",
        index,
    )


def scroll_to(page, y: float) -> None:
    page.evaluate("y => window.scrollTo(0, y)", y)
    page.wait_for_timeout(4)


def major_border_widths(page) -> list[dict[str, Any]]:
    return page.evaluate(
        """() => {
          const nodes = [...document.querySelectorAll('main,.chapter,.number-track,.chapter-number,.content,h1,.text')];
          return nodes.map(el => {
            const s = getComputedStyle(el);
            return {
              tag: el.tagName,
              cls: el.className || '',
              widths: [s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth]
            };
          });
        }"""
    )


def run_viewport(browser, html: str, name: str, width: int, height: int) -> dict[str, Any]:
    page = browser.new_page(viewport={"width": width, "height": height})
    page.set_content(html, wait_until="load")
    page.wait_for_timeout(10)

    counts = page.evaluate(
        """() => ({
          rail: document.querySelectorAll('.rail-line').length,
          chapters: document.querySelectorAll('.chapter').length,
          tracks: document.querySelectorAll('.number-track').length,
          numbers: document.querySelectorAll('.chapter-number').length
        })"""
    )
    check(counts == {"rail": 1, "chapters": 4, "tracks": 4, "numbers": 4}, "static_structure", counts)

    scroll_to(page, 0)
    first_num = rect(page, ".chapter-number", 0)
    rail = rect(page, ".rail-line", 0)
    square = first_num["height"]
    check(abs(first_num["width"] - square) <= 0.05, "number_is_square", first_num)
    check(abs(first_num["left"]) <= 0.05, "number_starts_at_viewport_left", first_num)
    check(abs(first_num["right"] - rail["left"]) <= TOL, "number_touches_single_rail", {"number_right":first_num["right"],"rail_left":rail["left"]})

    overflow = page.evaluate("() => ({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})")
    check(overflow["sw"] <= overflow["cw"], "no_horizontal_overflow", overflow)

    content_bounds = page.eval_on_selector_all(
        ".content",
        "els => els.map(el => { const r=el.getBoundingClientRect(); return ({left:r.left,right:r.right}); })",
    )
    check(all(0 <= r["left"] <= width and r["right"] <= width + TOL for r in content_bounds), "content_within_viewport", {"bounds":content_bounds,"width":width})

    border_data = major_border_widths(page)
    bad_borders = [x for x in border_data if any(float(v.replace("px", "")) > 0 for v in x["widths"])]
    check(not bad_borders, "no_extra_css_borders_on_major_elements", {"bad":bad_borders})

    pseudo = page.eval_on_selector_all(
        ".chapter",
        """els => els.map(el => {
          const r=el.getBoundingClientRect(); const s=getComputedStyle(el,'::before');
          return {chapterTop:r.top, pseudoTop:parseFloat(s.top), height:parseFloat(s.height), bg:s.backgroundColor, content:s.content};
        })""",
    )
    check(all(abs(x["pseudoTop"]) <= 0.05 and 0.5 <= x["height"] <= 1.5 and x["bg"] not in ("rgba(0, 0, 0, 0)", "transparent") for x in pseudo), "chapter_dividers_visible", {"pseudo":pseudo})

    chapter_tops = [doc_top(page, ".chapter", i) for i in range(4)]

    for i in range(1, 4):
        y1 = max(0.0, chapter_tops[i] - height * 0.78)
        y2 = min(chapter_tops[i] - square - 4, y1 + 17)
        if y2 <= y1:
            continue
        scroll_to(page, y1)
        n1 = rect(page, ".chapter-number", i)["top"]
        h1_1 = rect(page, "h1", i)["top"]
        c1 = rect(page, ".chapter", i)["top"]
        scroll_to(page, y2)
        n2 = rect(page, ".chapter-number", i)["top"]
        h1_2 = rect(page, "h1", i)["top"]
        c2 = rect(page, ".chapter", i)["top"]
        dy = y2 - y1
        check(abs((n2-n1) + dy) <= TOL and abs((h1_2-h1_1) + dy) <= TOL and abs((c2-c1) + dy) <= TOL,
              "incoming_number_title_chapter_lockstep", {"i":i,"dy":dy,"n":n2-n1,"h1":h1_2-h1_1,"chapter":c2-c1})

    transitions: dict[str, Any] = {}
    for i in range(3):
        next_top = chapter_tops[i+1]
        contact_y = next_top - square
        mid_y = next_top - square/2
        handoff_y = next_top

        scroll_to(page, contact_y)
        old_c = rect(page, ".chapter-number", i)
        new_c = rect(page, ".chapter-number", i+1)
        check(abs(old_c["top"]) <= TOL, "prior_number_pinned_until_contact", {"i":i,"old":old_c,"new":new_c})
        check(abs(old_c["bottom"] - new_c["top"]) <= TOUCH_TOL, "contact_no_gap_or_intersection", {"i":i,"old_bottom":old_c["bottom"],"new_top":new_c["top"]})

        scroll_to(page, mid_y)
        old_m = rect(page, ".chapter-number", i)
        new_m = rect(page, ".chapter-number", i+1)
        check(old_m["top"] < -1 and new_m["top"] > -1, "incoming_physically_displaces_prior", {"i":i,"old":old_m,"new":new_m})
        check(abs(old_m["bottom"] - new_m["top"]) <= TOUCH_TOL, "midpush_no_gap_or_intersection", {"i":i,"old_bottom":old_m["bottom"],"new_top":new_m["top"]})

        scroll_to(page, handoff_y)
        old_h = rect(page, ".chapter-number", i)
        new_h = rect(page, ".chapter-number", i+1)
        check(abs(new_h["top"]) <= TOL, "handoff_new_number_pinned", {"i":i,"new":new_h})
        check(abs(old_h["bottom"] - new_h["top"]) <= TOUCH_TOL, "handoff_continuous", {"i":i,"old_bottom":old_h["bottom"],"new_top":new_h["top"]})

        start = int(math.floor(contact_y))
        end = int(math.ceil(handoff_y))
        prev_old_top = prev_new_top = None
        max_step = 0.0
        max_touch_error = 0.0
        for y in range(start, end + 1):
            scroll_to(page, y)
            old_r = rect(page, ".chapter-number", i)
            new_r = rect(page, ".chapter-number", i+1)
            touch_error = abs(old_r["bottom"] - new_r["top"])
            max_touch_error = max(max_touch_error, touch_error)
            check(touch_error <= TOUCH_TOL, "one_px_sweep_gap_or_intersection", {"i":i,"y":y,"touch_error":touch_error,"old":old_r,"new":new_r})
            if prev_old_top is not None:
                step = max(abs(old_r["top"]-prev_old_top), abs(new_r["top"]-prev_new_top))
                max_step = max(max_step, step)
                check(step <= 1.05, "one_px_sweep_jitter", {"i":i,"y":y,"step":step})
            prev_old_top, prev_new_top = old_r["top"], new_r["top"]

        transitions[f"{i+1}_to_{i+2}"] = {
            "contact_old_top": old_c["top"],
            "contact_old_bottom": old_c["bottom"],
            "contact_incoming_top": new_c["top"],
            "midpush_old_top": old_m["top"],
            "midpush_old_bottom": old_m["bottom"],
            "midpush_incoming_top": new_m["top"],
            "handoff_old_bottom": old_h["bottom"],
            "handoff_incoming_top": new_h["top"],
            "max_1px_step": max_step,
            "max_touch_error_px": max_touch_error,
        }

    max_scroll = page.evaluate("() => document.documentElement.scrollHeight - innerHeight")
    scroll_to(page, max(0, max_scroll - 50))
    final_a = rect(page, ".chapter-number", 3)["top"]
    scroll_to(page, max_scroll)
    final_b = rect(page, ".chapter-number", 3)["top"]
    check(abs(final_a) <= TOL and abs(final_b) <= TOL, "final_number_remains_pinned", {"max_scroll":max_scroll,"minus50":final_a,"max":final_b})

    page.close()
    return {
        "viewport": [width, height],
        "square_px": square,
        "rail_x_px": rail["left"],
        "scroll_width_px": overflow["sw"],
        "transitions": transitions,
        "final": {"max_scroll_y": max_scroll, "number_04_top_at_max_minus_50": final_a, "number_04_top_at_max": final_b},
        "result": "PASS",
    }


def run_suite(html: str) -> dict[str, Any]:
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        try:
            for name, (w, h) in VIEWPORTS.items():
                results[name] = run_viewport(browser, html, name, w, h)
        finally:
            browser.close()
    return results


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("fixture", type=Path)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    data = args.fixture.read_bytes()
    blob = git_blob_sha(data)
    check(blob == EXPECTED_BLOB, "fixture_blob_sha", {"expected":EXPECTED_BLOB,"actual":blob,"path":str(args.fixture)})
    html = data.decode("utf-8")

    baseline = run_suite(html)

    mutation = html.replace("position:sticky;", "position:relative;", 1)
    check(mutation != html, "mutation_applied")
    mutation_detected = False
    mutation_error = None
    try:
        run_suite(mutation)
    except AssertionError as e:
        mutation_detected = True
        mutation_error = str(e)
    check(mutation_detected, "intentional_mutation_must_fail")

    result = {
        "schema": "prometeo.scroll-v17-regression-result/v1",
        "fixture_git_blob_sha": blob,
        "expected_git_blob_sha": EXPECTED_BLOB,
        "baseline": baseline,
        "mutation": {
            "change": "first .chapter-number position:sticky -> position:relative",
            "detected": mutation_detected,
            "first_failure": mutation_error,
        },
        "overall": "PASS",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2 if args.json else None, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
