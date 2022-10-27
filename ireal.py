from pyrealpro import Song, Measure, TimeSignature
import json

def json_to_song(filename):
	with open(filename,encoding="UTF-8") as f:j=json.loads(f.read())
	measures=[]
	chords=j["chords"]
	for i,chord in enumerate(chords):
		if type(chord)==list or not chord.startswith("/"):
			measures.append(Measure(chord,TimeSignature(j["time_signature"][0],j["time_signature"][1])))
			print("appended",measures)

		if i>0 and type(chords[i-1])!=list and chords[i-1].startswith("/m"):
			chor=chords[i-1].split(" ")
			for ch in chor:
				if ch in Measure.BARLINES_OPEN:measures[-1].barline_open=ch
				if ch in Measure.REHEARSAL_MARKS:measures[-1].rehearsal_marks=ch
		if i<len(chords)-1 and type(chords[i+1])!=list and chords[i+1].startswith("/m"):
			chor=chords[i+1].split(" ")
			for ch in chor:
				if ch in Measure.BARLINES_CLOSE:measures[-1].barline_close=ch
				if ch in Measure.ENDINGS:measures[-1].ending=ch
				if ch=="text":measures[-1].staff_text=chords[i+1][6:]
	return Song(title=j["title"], measures=measures, key=j["key"], style=j["style"], composer_name_first=j["composer"][0],composer_name_last=j["composer"][1])
