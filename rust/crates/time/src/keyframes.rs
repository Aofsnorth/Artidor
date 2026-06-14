pub trait Interpolate {
    fn interpolate(start: &Self, end: &Self, t: f64) -> Self;
}

impl Interpolate for f64 {
    fn interpolate(start: &Self, end: &Self, t: f64) -> Self {
        start + (end - start) * t
    }
}

impl Interpolate for [f64; 2] {
    fn interpolate(start: &Self, end: &Self, t: f64) -> Self {
        [
            start[0] + (end[0] - start[0]) * t,
            start[1] + (end[1] - start[1]) * t,
        ]
    }
}

impl Interpolate for [f64; 3] {
    fn interpolate(start: &Self, end: &Self, t: f64) -> Self {
        [
            start[0] + (end[0] - start[0]) * t,
            start[1] + (end[1] - start[1]) * t,
            start[2] + (end[2] - start[2]) * t,
        ]
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Easing {
	Linear,
	Hold,
	EaseIn,
	EaseOut,
	EaseInOut,
	CustomBezier(f64, f64, f64, f64), // control points: x1, y1, x2, y2
	/// Bounce: animates a value as if affected by gravity, falling toward
	/// the final value then recoiling with a bouncing motion.
	Bounce,
	/// Elastic: shoots past the final value then settles back like a spring.
	Elastic,
	/// Cyclic: repeats the progression between initial and final values.
	Cyclic,
	/// Random: controlled randomness in the progression (Brownian motion style).
	Random,
	/// Steps: animates in discrete intervals rather than smoothly.
	Steps(u32),
	/// Elastic Steps: like Steps but with elastic bounce at each step.
	ElasticSteps(u32),
}

impl Easing {
	pub fn evaluate(&self, t: f64) -> f64 {
		match *self {
			Easing::Linear => t,
			Easing::Hold => {
				if t >= 1.0 {
					1.0
				} else {
					0.0
				}
			}
			Easing::EaseIn => solve_bezier(0.42, 0.0, 1.0, 1.0, t),
			Easing::EaseOut => solve_bezier(0.0, 0.0, 0.58, 1.0, t),
			Easing::EaseInOut => solve_bezier(0.42, 0.0, 0.58, 1.0, t),
			Easing::CustomBezier(x1, y1, x2, y2) => solve_bezier(x1, y1, x2, y2, t),
			Easing::Bounce => eval_bounce(t),
			Easing::Elastic => eval_elastic(t),
			Easing::Cyclic => eval_cyclic(t),
			Easing::Random => eval_random(t),
			Easing::Steps(n) => eval_steps(t, n.max(1)),
			Easing::ElasticSteps(n) => eval_elastic_steps(t, n.max(1)),
		}
	}
}

/// Bounce easing: animates toward final value with decreasing amplitude bounces.
fn eval_bounce(t: f64) -> f64 {
	if t <= 0.0 {
		return 0.0;
	}
	if t >= 1.0 {
		return 1.0;
	}
	// Standard 4-bounce approximation. Bounce pattern: 0 -> 1 -> 0.5 -> 1 -> ...
	// The bounces are scaled against time using a tuned decay.
	let n1 = 7.5625;
	let d1 = 2.75;
	if t < 1.0 / d1 {
		return n1 * t * t;
	} else if t < 2.0 / d1 {
		let t = t - 1.5 / d1;
		return n1 * t * t + 0.75;
	} else if t < 2.5 / d1 {
		let t = t - 2.25 / d1;
		return n1 * t * t + 0.9375;
	} else {
		let t = t - 2.625 / d1;
		return n1 * t * t + 0.984375;
	}
}

/// Elastic easing: sinusoidal decay with overshoot.
fn eval_elastic(t: f64) -> f64 {
	if t <= 0.0 {
		return 0.0;
	}
	if t >= 1.0 {
		return 1.0;
	}
	let p = 0.3;
	let s = p / 4.0;
	let post_fix = 2.0_f64.powf(10.0 * (t - 1.0));
	-((t - s).max(0.0).sin() * post_fix).min(0.0) * (t - 1.0).signum()
}

/// Cyclic easing: smooth back-and-forth oscillation.
fn eval_cyclic(t: f64) -> f64 {
	if t <= 0.0 || t >= 1.0 {
		return 0.0;
	}
	let s = (t * std::f64::consts::TAU).sin();
	(1.0 - s) / 2.0
}

/// Random easing: deterministic pseudo-random interpolation. We use a
/// hash of t for a stable, repeatable output.
fn eval_random(t: f64) -> f64 {
	if t >= 1.0 {
		return 1.0;
	}
	if t <= 0.0 {
		return 0.0;
	}
	let h = (t * 9871.0).sin().abs();
	// Use a weighted average of t and a random value to make it feel like
	// a noisy interpolation.
	let noise = h.fract();
	t * 0.5 + noise * 0.5
}

/// Steps easing: quantize the progress to discrete intervals.
fn eval_steps(t: f64, n: u32) -> f64 {
	if t >= 1.0 {
		return 1.0;
	}
	if t <= 0.0 {
		return 0.0;
	}
	let step = (t * n as f64).floor() / (n.saturating_sub(1).max(1)) as f64;
	step.min(1.0)
}

/// Elastic Steps: combine Steps with a small elastic overshoot at each step.
fn eval_elastic_steps(t: f64, n: u32) -> f64 {
	if t >= 1.0 {
		return 1.0;
	}
	if t <= 0.0 {
		return 0.0;
	}
	let step = (t * n as f64).floor() / (n.saturating_sub(1).max(1)) as f64;
	// Add a small overshoot at the current step.
	let t_in_step = (t * n as f64).fract();
	let overshoot = (t_in_step * std::f64::consts::PI).sin() * 0.1;
	(step + overshoot).clamp(0.0, 1.0)
}

fn solve_bezier(x1: f64, y1: f64, x2: f64, y2: f64, target_x: f64) -> f64 {
    if target_x <= 0.0 {
        return 0.0;
    }
    if target_x >= 1.0 {
        return 1.0;
    }

    let sample_x = |t: f64| {
        let one_minus_t = 1.0 - t;
        3.0 * one_minus_t * one_minus_t * t * x1 + 3.0 * one_minus_t * t * t * x2 + t * t * t
    };

    let sample_y = |t: f64| {
        let one_minus_t = 1.0 - t;
        3.0 * one_minus_t * one_minus_t * t * y1 + 3.0 * one_minus_t * t * t * y2 + t * t * t
    };

    let get_slope = |t: f64| {
        let a = 3.0 * x1 - 3.0 * x2 + 1.0;
        let b = 3.0 * (x2 - 2.0 * x1);
        let c = 3.0 * x1;
        3.0 * a * t * t + 2.0 * b * t + c
    };

    let mut t = target_x;
    for _ in 0..8 {
        let x = sample_x(t) - target_x;
        let slope = get_slope(t);
        if slope.abs() < 1e-6 {
            break;
        }
        t -= x / slope;
    }

    if (sample_x(t) - target_x).abs() > 1e-4 {
        let mut t0 = 0.0;
        let mut t1 = 1.0;
        t = target_x;
        for _ in 0..20 {
            let x = sample_x(t);
            if (x - target_x).abs() < 1e-5 {
                break;
            }
            if target_x > x {
                t0 = t;
            } else {
                t1 = t;
            }
            t = (t0 + t1) * 0.5;
        }
    }

    sample_y(t)
}

#[derive(Debug, Clone)]
pub struct Keyframe<T> {
    pub time: f64,
    pub value: T,
    pub easing: Easing,
}

#[derive(Debug, Clone)]
pub struct KeyframeSequence<T> {
    keyframes: Vec<Keyframe<T>>,
}

impl<T: Interpolate + Clone> KeyframeSequence<T> {
    pub fn new(mut keyframes: Vec<Keyframe<T>>) -> Self {
        keyframes.sort_by(|a, b| a.time.partial_cmp(&b.time).unwrap_or(std::cmp::Ordering::Equal));
        Self { keyframes }
    }

    pub fn evaluate(&self, time: f64) -> Option<T> {
        if self.keyframes.is_empty() {
            return None;
        }
        if self.keyframes.len() == 1 {
            return Some(self.keyframes[0].value.clone());
        }

        let first = &self.keyframes[0];
        let last = &self.keyframes[self.keyframes.len() - 1];

        if time <= first.time {
            return Some(first.value.clone());
        }
        if time >= last.time {
            return Some(last.value.clone());
        }

        let idx = match self.keyframes.binary_search_by(|k| {
            k.time.partial_cmp(&time).unwrap_or(std::cmp::Ordering::Equal)
        }) {
            Ok(i) => i,
            Err(i) => i - 1,
        };

        let start_kf = &self.keyframes[idx];
        let end_kf = &self.keyframes[idx + 1];

        let duration = end_kf.time - start_kf.time;
        if duration <= 0.0 {
            return Some(end_kf.value.clone());
        }

        let t = (time - start_kf.time) / duration;
        let eased_t = start_kf.easing.evaluate(t);

        Some(T::interpolate(&start_kf.value, &end_kf.value, eased_t))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_linear_interpolation() {
        let seq = KeyframeSequence::new(vec![
            Keyframe {
                time: 0.0,
                value: 10.0,
                easing: Easing::Linear,
            },
            Keyframe {
                time: 10.0,
                value: 20.0,
                easing: Easing::Linear,
            },
        ]);

        assert_eq!(seq.evaluate(0.0), Some(10.0));
        assert_eq!(seq.evaluate(5.0), Some(15.0));
        assert_eq!(seq.evaluate(10.0), Some(20.0));
        assert_eq!(seq.evaluate(-1.0), Some(10.0));
        assert_eq!(seq.evaluate(11.0), Some(20.0));
    }

    #[test]
    fn test_hold_interpolation() {
        let seq = KeyframeSequence::new(vec![
            Keyframe {
                time: 0.0,
                value: 10.0,
                easing: Easing::Hold,
            },
            Keyframe {
                time: 10.0,
                value: 20.0,
                easing: Easing::Hold,
            },
        ]);

        assert_eq!(seq.evaluate(0.0), Some(10.0));
        assert_eq!(seq.evaluate(5.0), Some(10.0));
        assert_eq!(seq.evaluate(9.99), Some(10.0));
        assert_eq!(seq.evaluate(10.0), Some(20.0));
    }

    #[test]
    fn test_bezier_interpolation() {
        let seq = KeyframeSequence::new(vec![
            Keyframe {
                time: 0.0,
                value: 0.0,
                easing: Easing::CustomBezier(0.42, 0.0, 0.58, 1.0),
            },
            Keyframe {
                time: 1.0,
                value: 100.0,
                easing: Easing::Linear,
            },
        ]);

        let mid = seq.evaluate(0.5).unwrap();
        // For symmetric EaseInOut (0.42, 0, 0.58, 1), the midpoint should be exactly 50%
        assert!((mid - 50.0).abs() < 1e-5);
    }
}
