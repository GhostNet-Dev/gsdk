const soundPath = "assets/sounds/"
/*
| 탄환             | 용도         | 특징            |
| -------------- | ---------- | ------------- |
| .22LR          | 입문, 훈련     | 저반동, 저살상력     |
| .308 / 7.62x51 | 사냥, 저격     | 중장거리 고위력      |
| 5.56 NATO      | 군용 돌격소총    | 빠르고 가벼움       |
| 7.62x39        | AK류 소총     | 강한 근중거리 화력    |
| 7.62x54R       | 구소련 저격/기관총 | 강력한 구식 탄환     |
| 9mm            | 권총, SMG    | 범용적, 낮은 반동    |
| 20게이지          | 사냥, 홈디펜스   | 적당한 위력, 쉬운 조작 |
*/
export enum SoundType {
    AK762x39 = `${soundPath}weapons/Isolated/7.62x39/MP3/762x39 Single Isolated MP3.mp3`,
    AK762x54R = `${soundPath}weapons/Isolated/7.62x54R/MP3/762x54r Single Isolated MP3.mp3`,
    Pistol9mm = `${soundPath}weapons/Isolated/9mm/MP3/9mm Single Isolated.mp3`,
    Training22LR = `${soundPath}weapons/Isolated/0.22LR/MP3/22LR Single Isolated MP3.mp3`,
    Sniper308 = `${soundPath}weapons/Isolated/0.308_7.62x51/MP3/308 Single Isolated.mp3`,
    NATO556 = `${soundPath}weapons/Isolated/5.56/MP3/556 Single Isolated MP3.mp3`,
    Hunting20Gauge = `${soundPath}weapons/Isolated/20_gauge/MP3/20 Gauge Single Isolated.mp3`,

    MeadowBirds =  `${soundPath}essentials_series_nox_sound/sample_a_sound_effect/ambiance_nature_meadow_birds_flies_calm_loop_stereo.mp3`,
    NightLoop =  `${soundPath}essentials_series_nox_sound/nature_essentials_nox_sound/ambiance_night_loop_stereo.mp3`,
}