FILE := thesis
OUTDIR  := build
RESULT  := report

pdf:
	# Also see .latexmkrc
	latexmk -outdir=$(OUTDIR) -pdf $(FILE)
	cp $(OUTDIR)/$(FILE).pdf $(RESULT).pdf 

clean:
	rm -rf $(filter-out $(OUTDIR)/$(FILE).pdf, $(wildcard $(OUTDIR)/*))

purge:
	rm -rf $(OUTDIR)

.PHONY: latexmk clean purge
