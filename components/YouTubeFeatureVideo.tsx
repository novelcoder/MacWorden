"use client";

import { useState, type CSSProperties } from "react";

type YouTubeFeatureVideoProps = {
  videoId?: string;
  title?: string;
  durationLabel?: string;
  orientation?: "portrait" | "landscape" | "cropped-landscape";
  analyticsPlacement?: string;
};

export default function YouTubeFeatureVideo({
  videoId = "YbHJx247EY4",
  title = "Stray Evidence introduction",
  durationLabel = "20-second",
  orientation = "portrait",
  analyticsPlacement = "homepage_featured_video",
}: YouTubeFeatureVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnailStyle = {
    "--video-thumbnail": `url(https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg)`,
  } as CSSProperties;
  const orientationClass =
    orientation === "cropped-landscape"
      ? " video-cropped-landscape"
      : orientation === "landscape"
        ? " video-landscape"
        : "";
  const playerOptions = orientation === "cropped-landscape" ? "&controls=0" : "";

  return (
    <>
      {isPlaying ? (
        <div className={`youtube-feature-player${orientationClass}`}>
          <iframe
            className="youtube-feature-iframe"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0${playerOptions}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          type="button"
          className={`video-poster${orientationClass}`}
          style={thumbnailStyle}
          onClick={() => setIsPlaying(true)}
          aria-label={`Play ${title}`}
          data-analytics-event="select_content"
          data-analytics-item-name={title}
          data-analytics-placement={analyticsPlacement}
          data-analytics-content-format="video"
        >
          <span className="video-poster-play" aria-hidden="true">
            <span />
          </span>
          <span className="video-poster-copy">Play the {durationLabel} introduction</span>
        </button>
      )}
      <a
        className="video-youtube-link"
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-analytics-event="select_content"
        data-analytics-item-name={title}
        data-analytics-placement={analyticsPlacement}
        data-analytics-content-format="video"
      >
        Watch on YouTube <span aria-hidden="true">↗</span>
      </a>
    </>
  );
}
