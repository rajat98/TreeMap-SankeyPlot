const COLOR_HEX_VALUE_LIST = ['#FFFFB4', '#8ED3C8', '#BFBADB']
let treemapSvg, sankeySvg
const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z']
const vowels = ['a', 'e', 'i', 'o', 'u', 'y']
const punctuations = ['.', ',', '!', '?', ':', ';']

let nodes, links, treemapNodes, colorScale
const drawTreeMap = (event) => {
    event.preventDefault();
    const inputText = document.getElementById("wordbox").value
    const cleanedText = getCleanedText(inputText)
    const charDataset = getCharDict(cleanedText)
    clearTreeMap()
    clearSankeyChart()
    createTreeMap(charDataset, cleanedText)
}

const clearTreeMap = () => {
    if (treemapSvg !== null && treemapSvg !== undefined)
        treemapSvg.selectAll('*').remove();
}

const clearSankeyChart = () => {
    if (sankeySvg !== null && sankeySvg !== undefined)
        sankeySvg.selectAll('*').remove();
}

const getGroupId = (char) => {
    if (consonants.includes(char))
        return 0
    else if (vowels.includes((char)))
        return 1
    return 2
}

const getTootTip = () => {
    return d3
        .select('body')
        .append('div')
        .style('position', 'absolute')
        .style('z-index', '10')
        .style('visibility', 'hidden')
        .style('background-color', 'white')
        .style('border', 'solid')
        .style('border-width', '2px')
        .style('border-radius', '5px')
        .style('padding', '5px');
}
const createTreeMap = (charDataset, cleanedText) => {
    // Convert data to a flat array for D3.js TreeMap layout
    let flatData = [];
    for (const group of Array.from(charDataset.keys())) {
        for (const character of Array.from(charDataset.get(group).keys())) {
            flatData.push({group: group, character: character, frequency: charDataset.get(group).get(character)});
        }
    }

    const margin = {top: 5, right: 5, bottom: 5, left: 5};
    const width = 580 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Set up color scale for groups
    colorScale = d3.scaleOrdinal()
        .domain(["consonants", "vowels", "punctuation"])
        .range(COLOR_HEX_VALUE_LIST);
    const padding = 3;

    // Create TreeMap layout
    const treemap = d3.treemap()
        .size([width, height])
    // .padding(padding)
    // .round(true);

    // Set up SVG container
    treemapSvg = d3.select('#treemap_svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


    // Create hierarchical data structure
    const root = d3.hierarchy({
        values: Array.from(d3.group(flatData, d => d.group), ([key, values]) => ({
            key, values
        }))
    }, d => d.values)
        .sum(d => d.frequency);

    // Generate TreeMap nodes
    treemapNodes = treemap(root).leaves();

    const tooltip = getTootTip()

    // Draw rectangles for each node
    treemapSvg.selectAll('.rect')
        .data(treemapNodes)
        .enter()
        .append('rect')
        .attr('x', d => d.x0 + padding)
        .attr('class', 'treenode')
        .attr('y', d => d.y0 + padding)
        .attr('width', d => d.x1 - d.x0 - 2 * padding)
        .attr('height', d => d.y1 - d.y0 - 2 * padding)
        .style('fill', d => colorScale(d.data.group))
        .attr('stroke', 'black')  // Set stroke color
        .attr('stroke-width', 1)
        .on('click', (event, d) => createSankeyChart(d.data, cleanedText))
        .on('mouseover', function (event, d) {
            tooltip.style('visibility', 'visible');
            d3.select(this)
                .style('fill', '#8cff32')
                .attr('stroke', 'black')
                .attr('stroke-width', 3);
            if (sankeySvg !== undefined)
                sankeySvg.selectAll('.node')
                    .data(nodes)
                    .style('fill', s => {
                        if (d.data.character === s.character)
                            return '#8cff32'
                        else
                            return getNodeColor(s.character)
                    })
            // highlightCharactersFromTreeMap(d.data.character, d => colorScale(d.data.group))
        })
        .on('mousemove', function (event, d) {
            tooltip
                .style('top', event.pageY - 10 + 'px')
                .style('left', event.pageX + 10 + 'px')
                .html(`Character: ${d.data.character}<br>Count: ${d.data.frequency}`);
        })
        .on('mouseout', function (event, d) {
            tooltip.style('visibility', 'hidden');
            d3.select(this)
                .style('fill', d => colorScale(d.data.group))
                .attr('stroke', 'black')
                .attr('stroke-width', 1);
            if (sankeySvg !== undefined)
                sankeySvg.selectAll('.node')
                    .data(nodes)
                    .style('fill', s => getNodeColor(s.character))
        });
}

const createSankeyChart = (data, cleanedText) => {
    clearSankeyChart()
    // set the dimensions and margins of the graph
    const margin = {top: 10, right: 10, bottom: 10, left: 10},
        width = 580 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    sankeySvg = d3.select('#sankey_svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    const selectedChar = data.character;
    document.getElementById('flow_label').textContent = `Character flow for '${selectedChar}'`;

    const proceedingSucceedingCharDataset = getProceedingSucceedingCharDict(selectedChar, cleanedText)

    const NODE_WIDTH = 15

    // Create a Sankey layout
    const sankey = d3.sankey()
        .nodeWidth(NODE_WIDTH)
        .nodePadding(10)
        .size([width, height]);

    // Create nodes and links from the data
    const sankeyData = sankey(getNodesAndLinksData(data, proceedingSucceedingCharDataset));
    nodes = sankeyData.nodes
    links = sankeyData.links

    let tooltip = getTootTip();

    // Adjust node positions
    nodes.forEach(node => {
        if (node.alignment === 0) {
            node.x0 = width / 10 - NODE_WIDTH;
            node.x1 = width / 10 + NODE_WIDTH;
        } else if (node.alignment === 1) {
            node.x0 = width / 2 - NODE_WIDTH;
            node.x1 = width / 2 + NODE_WIDTH;
        } else if (node.alignment === 2) {
            node.x0 = width * 9 / 10 - NODE_WIDTH;
            node.x1 = width * 9 / 10 + NODE_WIDTH;
        }
    });

    const verticalPadding = 5
    // Draw links
    sankeySvg.append('g')
        .selectAll('.link')
        .data(links)
        .enter().append('path')
        .attr('class', 'link')
        .attr('d', d3.sankeyLinkHorizontal()
            .source(d => [d.source.x1, d.y0 + verticalPadding])
            .target(d => [d.target.x0, d.y1 + verticalPadding]))
        .attr('stroke', '#aaa')
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('fill', 'none')

    // Draw nodes
    sankeySvg.append('g')
        .selectAll('.node')
        .data(nodes)
        .enter()
        .append('rect')
        .attr('class', 'node')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0 + verticalPadding)
        .attr('height', d => d.y1 - d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('rx', 5)
        .attr('ry', 5)
        .style('fill', d => getNodeColor(d.character))
        .style('stroke', 'black').style('border-radius', '5px')
        .on('mouseover', function (event, d) {
            tooltip.style('visibility', 'visible');

            d3.select(this)
                .style('fill', '#8cff32')
                .attr('stroke', 'black')
                .attr('stroke-width', 3);

            treemapSvg.selectAll('.treenode')
                .data(treemapNodes)
                .style('fill', m => {
                    if (m.data.character === d.character)
                        return '#8cff32'
                    else
                        return colorScale(m.data.group)
                })
        })
        .on('mousemove', function (event, d) {
            tooltip
                .style('top', event.pageY - 10 + 'px')
                .style('left', event.pageX + 10 + 'px')
            if (d.alignment === 0) {
                if(d.character===' ')
                    tooltip.html(`Character: '${d.character}' flows into<br>'${selectedChar}' ${d.value-1} times.`);
                else
                    tooltip.html(`Character: '${d.character}' flows into<br>'${selectedChar}' ${d.value} times.`);
            } else if (d.alignment === 1) {
                tooltip.html(`Character: ${selectedChar} appears ${d.value} times.`);
            } else {
                if(d.character===' ')
                    tooltip.html(`Character: '${selectedChar}' flows into '${d.character}' ${d.value-1} times.`);
                else
                    tooltip.html(`Character: '${selectedChar}' flows into '${d.character}' ${d.value} times.`);
            }
        })
        .on('mouseout', function (event, d) {
            tooltip.style('visibility', 'hidden');
            d3.select(this)
                .style('fill', d => getNodeColor(d.character))
                .attr('stroke', 'black')
                .attr('stroke-width', 1);
            if (treemapSvg !== undefined)
                treemapSvg.selectAll('.treenode')
                    .data(treemapNodes)
                    .style('fill', m => colorScale(m.data.group))
        });

    // Add labels to nodes
    sankeySvg.append('g')
        .selectAll('text')
        .data(nodes)
        .enter().append('text')
        .attr('x', d => d.x0 - (d.x1 - d.x0) / 2)
        .attr('y', d => (d.y0 + d.y1) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .text(d => d.character);
}

const getNodeColor = (char) => {
    const groupId = getGroupId(char)
    return COLOR_HEX_VALUE_LIST[groupId]
}
const getNodesAndLinksData = (data, proceedingSucceedingCharDataset) => {
    const nodesData = [];
    const linksData = [];
    let nodeId = 0;

    const proceedingMap = proceedingSucceedingCharDataset.proceedingMap;
    const succeedingMap = proceedingSucceedingCharDataset.succeedingMap;

    // Add nodes for the current character
    nodesData.push({
        id: nodeId++,
        group: getGroupId(data.character),
        value: data.frequency,
        character: data.character,
        alignment: 1
    });

    // Add nodes for proceeding characters
    proceedingMap.forEach((freq, proceedingChar) => {
        nodesData.push({
            id: nodeId,
            group: getGroupId(proceedingChar),
            value: freq,
            character: proceedingChar,
            alignment: 0
        });
        linksData.push({
            source: nodeId++, target: 0, value: freq // Adjust the value as needed
        });
    });

    // Add nodes for succeeding characters
    succeedingMap.forEach((freq, succeedingChar) => {
        nodesData.push({
            id: nodeId,
            group: getGroupId(succeedingChar),
            value: freq,
            character: succeedingChar,
            alignment: 2
        });
        linksData.push({
            source: 0, target: nodeId++, value: freq // Adjust the value as needed
        });
    });
    return {nodes: nodesData, links: linksData};
};

const getCleanedText = (inputText) => {
    let cleanedText = ""
    for (let i = 0; i < inputText.length; i++) {
        let currentChar = inputText.charAt(i)
        if (!consonants.includes(currentChar.toLowerCase()) && !vowels.includes(currentChar.toLowerCase()) && !punctuations.includes(currentChar.toLowerCase())) continue
        cleanedText += currentChar
    }
    return cleanedText
}

const getCharDict = (cleanedText) => {
    let charDict = new Map()

    for (let i = 0; i < cleanedText.length; i++) {
        let currentChar = cleanedText.charAt(i)
        if (consonants.includes(currentChar.toLowerCase())) {
            if (charDict.get("consonants") === undefined) {
                charDict.set("consonants", new Map())
            }
            if (charDict.get("consonants").get(currentChar) === undefined) {
                charDict.get("consonants").set(currentChar, 0)
            }
            charDict.get("consonants").set(currentChar, charDict.get("consonants").get(currentChar) + 1)
        }

        if (vowels.includes(currentChar.toLowerCase())) {
            if (charDict.get("vowels") === undefined) {
                charDict.set("vowels", new Map())
            }
            if (charDict.get("vowels").get(currentChar) === undefined) {
                charDict.get("vowels").set(currentChar, 0)
            }
            charDict.get("vowels").set(currentChar, charDict.get("vowels").get(currentChar) + 1)
        }

        if (punctuations.includes(currentChar.toLowerCase())) {
            if (charDict.get("punctuation") === undefined) {
                charDict.set("punctuation", new Map())
            }
            if (charDict.get("punctuation").get(currentChar) === undefined) {
                charDict.get("punctuation").set(currentChar, 0)
            }
            charDict.get("punctuation").set(currentChar, charDict.get("punctuation").get(currentChar) + 1)
        }
    }
    return charDict

}
const getProceedingSucceedingCharDict = (selectedChar, cleanedText) => {
    // Initialize empty maps
    const proceedingMap = new Map();
    const succeedingMap = new Map();

    // Loop through the cleanedText to analyze proceeding and succeeding characters
    for (let i = 0; i < cleanedText.length; i++) {
        const currentChar = cleanedText[i];

        // Check if the current character matches the selectedChar
        if (currentChar === selectedChar) {
            // Update proceedingMap if there is a character before the selectedChar
            if (i > 0) {
                const precedingChar = cleanedText[i - 1];
                proceedingMap.set(precedingChar, (proceedingMap.get(precedingChar) || 0) + 1);
            }

            // Update succeedingMap if there is a character after the selectedChar
            if (i < cleanedText.length - 1) {
                const succeedingChar = cleanedText[i + 1];
                succeedingMap.set(succeedingChar, (succeedingMap.get(succeedingChar) || 0) + 1);
            }
        }
    }
    if(proceedingMap.size===0){
        proceedingMap.set(' ', 1);
    }
    if(succeedingMap.size===0){
        succeedingMap.set(' ', 1);
    }
    // Return the result as an object
    return {
        proceedingMap, succeedingMap
    };
}

const highlightCharactersFromTreeMap = (charactersToHighlight, color) => {
    $('#wordbox').highlightWithinTextarea({
        highlight: [
            {
                highlight: charactersToHighlight,
                className: 'red'
            }]
    });
}