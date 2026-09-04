#!/usr/bin/env python3
"""Builds the three bundled profiles (Stream Deck 7 v3 format) for Deck for AXIS Camera Station Edge.
Pavel Kotyza <kotyza@gmail.com> — https://www.4xs.dev
"""
import json, os, shutil, uuid, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "build")
PLUGIN = {"Name": "Deck for AXIS Camera Station Edge", "UUID": "com.4xsdev.acs-edge", "Version": "1.0.0.0"}

def C(command): return dict(uuid="com.4xsdev.acs-edge.command", name="ACS Edge Command", settings={"command": command})
def O(): return dict(uuid="com.4xsdev.acs-edge.open", name="Open ACS Edge", settings={})

# Model codes: 20GAA9902 = Stream Deck MK.2 (15 keys), 20GAI9901 = Mini (6), 20GAT9901 = XL (32).
LAYOUTS = {
    "ACS Edge": dict(model="20GAA9902", device_type=0, keys={
        "0,0": C("prev"), "1,0": C("back"), "2,0": C("play"), "3,0": C("fwd"), "4,0": C("next"),
        "0,1": C("zoom-out"), "1,1": C("tilt-up"), "2,1": C("zoom-in"), "3,1": C("details"), "4,1": O(),
        "0,2": C("pan-left"), "1,2": C("tilt-down"), "2,2": C("pan-right"), "3,2": C("debug"), "4,2": C("help"),
    }),
    "ACS Edge Mini": dict(model="20GAI9901", device_type=1, keys={
        "0,0": C("prev"), "1,0": C("play"), "2,0": C("next"),
        "0,1": C("back"), "1,1": C("fwd"), "2,1": O(),
    }),
    "ACS Edge XL": dict(model="20GAT9901", device_type=2, keys={
        "0,0": C("prev"), "1,0": C("back"), "2,0": C("play"), "3,0": C("fwd"), "4,0": C("next"), "7,0": O(),
        "1,1": C("zoom-out"), "2,1": C("tilt-up"), "3,1": C("zoom-in"), "6,1": C("details"), "7,1": C("debug"),
        "1,2": C("pan-left"), "2,2": C("tilt-down"), "3,2": C("pan-right"), "7,2": C("help"),
    }),
}

def action(spec):
    return {"ActionID": str(uuid.uuid4()), "LinkedTitle": True, "Resources": None, "State": 0,
            "Name": spec["name"], "UUID": spec["uuid"], "Plugin": PLUGIN, "Settings": spec["settings"],
            "States": [{"FontFamily": "", "FontSize": 12, "FontStyle": "", "FontUnderline": False,
                        "OutlineThickness": 2, "ShowTitle": False, "TitleAlignment": "middle", "TitleColor": "#ffffff"}]}

def build(name, layout):
    shutil.rmtree(OUT, ignore_errors=True)
    prof, page = str(uuid.uuid4()).upper(), str(uuid.uuid4()).upper()
    root = os.path.join(OUT, f"{prof}.sdProfile"); pdir = os.path.join(root, "Profiles", page)
    os.makedirs(os.path.join(pdir, "Images")); os.makedirs(os.path.join(root, "Images"))
    json.dump({"Controllers": [{"Actions": {k: action(v) for k, v in layout["keys"].items()}, "Type": "Keypad"}], "Icon": "", "Name": ""},
              open(os.path.join(pdir, "manifest.json"), "w"), indent=2)
    json.dump({"Device": {"Model": layout["model"], "UUID": ""}, "Name": name,
               "Pages": {"Current": page.lower(), "Default": page.lower(), "Pages": [page.lower()]}, "Version": "3.0"},
              open(os.path.join(root, "manifest.json"), "w"), indent=2)
    z = os.path.join(HERE, f"{name}.streamDeckProfile")
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
        for dp, _, fs in os.walk(root):
            for f in fs: zf.write(os.path.join(dp, f), os.path.relpath(os.path.join(dp, f), OUT))
    print("wrote", z)

if __name__ == "__main__":
    for n, l in LAYOUTS.items(): build(n, l)
    shutil.rmtree(OUT, ignore_errors=True)
