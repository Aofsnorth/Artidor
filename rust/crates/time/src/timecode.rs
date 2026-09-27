use bridge::export;
use serde::{Deserialize, Serialize};

use crate::{
    frame_rate::FrameRate,
    media_time::{MediaTime, TICKS_PER_SECOND},
};

const SECONDS_PER_HOUR: i64 = 3_600;
const SECONDS_PER_MINUTE: i64 = 60;
const CENTISECONDS_PER_SECOND: i64 = 100;
const TICKS_PER_CENTISECOND: i64 = TICKS_PER_SECOND / CENTISECONDS_PER_SECOND;

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi, into_wasm_abi))]
#[derive(Serialize, Deserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub enum TimeCodeFormat {
    #[serde(rename = "MM:SS")]
    MmSs,
    #[serde(rename = "HH:MM:SS")]
    HhMmSs,
    #[serde(rename = "HH:MM:SS:CS")]
    HhMmSsCs,
    #[serde(rename = "HH:MM:SS:FF")]
    HhMmSsFf,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FormatTimecodeOptions {
    pub time: MediaTime,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub format: Option<TimeCodeFormat>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rate: Option<FrameRate>,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseTimecodeOptions {
    pub time_code: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub format: Option<TimeCodeFormat>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rate: Option<FrameRate>,
}

/// `MediaTime` crosses the wasm boundary as a JS number, so values beyond
/// 2^53 (Number.MAX_SAFE_INTEGER) panic inside the tsify conversion instead
/// of failing cleanly. Every `parse_timecode` result must stay within this
/// bound; real timelines max out around 1e9 ticks, so the cap is invisible
/// to legitimate edits while hand-typed garbage folds into `None`.
const MAX_JS_SAFE_TICKS: i64 = (1i64 << 53) - 1;

fn safe_media_time(ticks: i64) -> Option<MediaTime> {
    if ticks.abs() > MAX_JS_SAFE_TICKS {
        return None;
    }
    Some(MediaTime::from_ticks(ticks))
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuessTimecodeFormatOptions {
    pub time_code: String,
}

#[export]
pub fn guess_timecode_format(
    GuessTimecodeFormatOptions { time_code }: GuessTimecodeFormatOptions,
) -> Option<TimeCodeFormat> {
    if time_code.trim().is_empty() {
        return None;
    }

    let part_count = time_code
        .trim()
        .split(':')
        .try_fold(0usize, |count, part| {
            part.parse::<u32>().ok().map(|_| count + 1)
        })?;

    match part_count {
        2 => Some(TimeCodeFormat::MmSs),
        3 => Some(TimeCodeFormat::HhMmSs),
        4 => Some(TimeCodeFormat::HhMmSsFf),
        _ => None,
    }
}

#[export]
pub fn format_timecode(
    FormatTimecodeOptions { time, format, rate }: FormatTimecodeOptions,
) -> Option<String> {
    let format = format.unwrap_or(TimeCodeFormat::HhMmSsCs);
    let total_ticks = u64::try_from(time.as_ticks().max(0)).ok()?;
    let ticks_per_second = u64::try_from(TICKS_PER_SECOND).ok()?;
    let total_seconds = total_ticks / ticks_per_second;
    let hour_ticks = u64::try_from(SECONDS_PER_HOUR).ok()? * ticks_per_second;
    let minute_ticks = u64::try_from(SECONDS_PER_MINUTE).ok()? * ticks_per_second;
    let seconds_per_minute = u64::try_from(SECONDS_PER_MINUTE).ok()?;
    let ticks_per_centisecond = u64::try_from(TICKS_PER_CENTISECOND).ok()?;

    let hours = total_ticks / hour_ticks;
    let minutes = (total_ticks % hour_ticks) / minute_ticks;
    let seconds = total_seconds % seconds_per_minute;
    let second_ticks = total_ticks % ticks_per_second;
    let centiseconds = second_ticks / ticks_per_centisecond;

    match format {
        TimeCodeFormat::MmSs => Some(format!("{minutes:02}:{seconds:02}")),
        TimeCodeFormat::HhMmSs => Some(format!("{hours:02}:{minutes:02}:{seconds:02}")),
        TimeCodeFormat::HhMmSsCs => Some(format!(
            "{hours:02}:{minutes:02}:{seconds:02}:{centiseconds:02}"
        )),
        TimeCodeFormat::HhMmSsFf => {
            let rate = rate?;
            let ticks_per_frame = rate.ticks_per_frame()?;
            let frames = second_ticks / u64::try_from(ticks_per_frame).ok()?;
            Some(format!("{hours:02}:{minutes:02}:{seconds:02}:{frames:02}"))
        }
    }
}

#[export]
pub fn parse_timecode(
    ParseTimecodeOptions {
        time_code,
        format,
        rate,
    }: ParseTimecodeOptions,
) -> Option<MediaTime> {
    if time_code.trim().is_empty() {
        return None;
    }

    	let format = format.unwrap_or(TimeCodeFormat::HhMmSsCs);
    	let parts = time_code
    		.trim()
    		.split(':')
    		.map(|part| part.parse::<u32>().ok())
    		.collect::<Option<Vec<_>>>()?;

    	// Every part is a u32, so even a hand-typed value like
    	// "4294967295:59:59:99" overflows i64 tick math — this must fold into
    	// `None` (rejected edit) instead of panicking inside wasm.
    	let total_seconds = |hours: u32, minutes: u32, seconds: u32| -> Option<i64> {
    		i64::from(hours)
    			.checked_mul(SECONDS_PER_HOUR)?
    			.checked_add(i64::from(minutes).checked_mul(SECONDS_PER_MINUTE)?)?
    			.checked_add(i64::from(seconds))
    	};

    	match format {
    		TimeCodeFormat::MmSs => {
    			let [minutes, seconds] = parts.as_slice() else {
    				return None;
    			};
    			if i64::from(*seconds) >= SECONDS_PER_MINUTE {
    				return None;
    			}

			safe_media_time(
				total_seconds(0, *minutes, *seconds)?.checked_mul(TICKS_PER_SECOND)?,
			)
		}
    		TimeCodeFormat::HhMmSs => {
    			let [hours, minutes, seconds] = parts.as_slice() else {
    				return None;
    			};
    			if i64::from(*minutes) >= SECONDS_PER_MINUTE
    				|| i64::from(*seconds) >= SECONDS_PER_MINUTE
    			{
    				return None;
    			}

			safe_media_time(
				total_seconds(*hours, *minutes, *seconds)?.checked_mul(TICKS_PER_SECOND)?,
			)
		}
		TimeCodeFormat::HhMmSsCs => {
    			let [hours, minutes, seconds, centiseconds] = parts.as_slice() else {
    				return None;
    			};
    			if i64::from(*minutes) >= SECONDS_PER_MINUTE
    				|| i64::from(*seconds) >= SECONDS_PER_MINUTE
    				|| i64::from(*centiseconds) >= CENTISECONDS_PER_SECOND
    			{
    				return None;
    			}

			safe_media_time(
				total_seconds(*hours, *minutes, *seconds)?
					.checked_mul(TICKS_PER_SECOND)?
					.checked_add(i64::from(*centiseconds) * TICKS_PER_CENTISECOND)?,
			)
		}
    		TimeCodeFormat::HhMmSsFf => {
    			let rate = rate?;
    			let frame_upper_bound = rate.frame_number_upper_bound()?;
    			let [hours, minutes, seconds, frames] = parts.as_slice() else {
    				return None;
    			};
    			if i64::from(*minutes) >= SECONDS_PER_MINUTE
    				|| i64::from(*seconds) >= SECONDS_PER_MINUTE
    				|| *frames >= frame_upper_bound
    			{
    				return None;
    			}

				Some(
					safe_media_time(
						total_seconds(*hours, *minutes, *seconds)?.checked_mul(TICKS_PER_SECOND)?,
					)? + MediaTime::from_frame(i64::from(*frames), rate)?,
				)
			}
    	}
    }

#[cfg(test)]
mod tests {
    use crate::frame_rate::FrameRate;
    use crate::media_time::MediaTime;

    use super::{FormatTimecodeOptions, GuessTimecodeFormatOptions, ParseTimecodeOptions};
    use super::{TimeCodeFormat, format_timecode, guess_timecode_format, parse_timecode};

    #[test]
    fn formats_default_and_frame_timecodes() {
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(3723.45).unwrap(),
                format: None,
                rate: None,
            }),
            Some("01:02:03:45".to_string()),
        );
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(1.5).unwrap(),
                format: Some(TimeCodeFormat::HhMmSsFf),
                rate: Some(FrameRate::FPS_30),
            }),
            Some("00:00:01:15".to_string()),
        );
    }

    #[test]
    fn parses_timecodes() {
        assert_eq!(
            parse_timecode(ParseTimecodeOptions {
                time_code: "01:05".to_string(),
                format: Some(TimeCodeFormat::MmSs),
                rate: None,
            }),
            Some(MediaTime::from_seconds_f64(65.0).unwrap()),
        );
        assert_eq!(
            parse_timecode(ParseTimecodeOptions {
                time_code: "00:00:01:15".to_string(),
                format: Some(TimeCodeFormat::HhMmSsFf),
                rate: Some(FrameRate::FPS_30),
            }),
            Some(MediaTime::from_seconds_f64(1.5).unwrap()),
        );
        		assert_eq!(
        			parse_timecode(ParseTimecodeOptions {
        				time_code: "00:00:01:30".to_string(),
        				format: Some(TimeCodeFormat::HhMmSsFf),
        				rate: Some(FrameRate::FPS_30),
        			}),
        			None,
        		);
        	}

	#[test]
	fn rejects_out_of_range_timecodes_without_panicking() {
        		// u32-sized parts must fold into `None` instead of overflowing the
        		// i64 tick math (a wasm panic aborts the whole instance).
        		for time_code in [
        			"4294967295:59:59:99",
        			"600000000:59:59:99",
        			"4294967295:59:59",
        			"4294967295:59",
        		] {
        			assert_eq!(
        				parse_timecode(ParseTimecodeOptions {
        					time_code: time_code.to_string(),
        					format: None,
        					rate: Some(FrameRate::FPS_30),
        				}),
        				None,
        				"overflow input must be rejected: {time_code}",
        			);
        		}
        	}

    #[test]
    fn guesses_timecode_formats() {
        assert_eq!(
            guess_timecode_format(GuessTimecodeFormatOptions {
                time_code: "01:05".to_string(),
            }),
            Some(TimeCodeFormat::MmSs),
        );
        assert_eq!(
            guess_timecode_format(GuessTimecodeFormatOptions {
                time_code: "00:00:01".to_string(),
            }),
            Some(TimeCodeFormat::HhMmSs),
        );
        assert_eq!(
            guess_timecode_format(GuessTimecodeFormatOptions {
                time_code: "00:00:01:15".to_string(),
            }),
            Some(TimeCodeFormat::HhMmSsFf),
        );
    }
}
