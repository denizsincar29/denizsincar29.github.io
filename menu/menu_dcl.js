// a javascript that turns each menu section into a collapsible headers.
// all menu sections are h3s, so make everything between h3 and h(lower than 3) collapsible. Including h3.
// the collapsible header is the h3 itself.


// this script goes imported after the body content, because i forgot how to add events for domcontentloaded.

function getAllBelongings(header) {
    if (!header) {
        return []; // Return an empty array if the header is null or undefined
    }

    let belongings = [];
    let currentElement = header.nextSibling;  // Start looking after the header itself
    // log if null
    if (!currentElement) {
        console.log("header has no next sibling");
    }
    const headerLevel = parseInt(header.tagName.substring(1), 10); // Extract the header level (e.g., 3 from 'H3')

    while (currentElement) {
        const elementType = currentElement.tagName;

        // Check if we've encountered a header
        if (elementType && elementType.startsWith('H')) {
            const nextHeaderLevel = parseInt(elementType.substring(1), 10);

            // Stop if we find a header of the same or higher level
            if (nextHeaderLevel <= headerLevel) {
                break;
            } else {
                //If it is a header of a deeper level it belongs to us.
                belongings.push(currentElement);
            }
        } else {
            // It's not a header, so it belongs to the current header
            belongings.push(currentElement);
        }

        currentElement = currentElement.nextSibling; // Move to the next element
    }

    return belongings;
}

function main() {
    // get all h3s
    var h3s = document.getElementsByTagName("h3");
    // for each h3 we create a details element and a summary element. h3 goes inside details after summary.
    for (var i = 0; i < h3s.length; i++) {
        var h3 = h3s[i];
        var between = getAllBelongings(h3);  // get all elements between this h3 and the next simantic limit.
        var details = document.createElement("details");
        var summary = document.createElement("summary");
        summary.innerHTML = h3.innerHTML;
        details.appendChild(summary);
        h3.parentNode.insertBefore(details, h3);
        details.appendChild(h3);
        // now we need to move all the elements between this h3 and the next h3, or the end of the file, into this details.
        console.log(`h3 ${i} has ${between.length} elements between it and the next h3`);
        for (var j = 0; j < between.length; j++) {
            details.appendChild(between[j]);
        }

        console.log("done with this h3");
    }
}

document.addEventListener("DOMContentLoaded", main);