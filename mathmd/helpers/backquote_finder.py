with open("../md/"+input("enter md file to find delimiters")+".md","r",encoding="UTF-8") as f:
	for i,line in enumerate(f):
		if line.count("`")%2>0:
			print("line ",i+1,"not even number of ascii math delims")

input("press enter to exit")