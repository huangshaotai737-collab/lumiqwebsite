import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/assets/home-video");
// Same frames and timestamps, including the 60 fps tail. A three-frame GOP
// keeps reverse seeking cheap without shipping a 28 MB all-intra movie.
execFileSync("ffmpeg", [
  "-v", "error", "-y", "-i", path.join(assets, "opening-user-clean-float60-20260907.mp4"),
  "-vf", "scale=1920:-2", "-an", "-c:v", "libx264", "-preset", "slow",
  "-crf", "23", "-g", "3", "-bf", "0", "-pix_fmt", "yuv420p",
  "-enc_time_base", "1:120", "-fps_mode", "vfr", "-video_track_timescale", "120000",
  "-movflags", "+faststart", path.join(assets, "opening-web-20260907.mp4"),
], { stdio: "inherit" });
