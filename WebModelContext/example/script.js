// Authors: Andrew Nolan, Brandon Walderman
// Date: 7-16-2025
// Sample code. NOT to be used in production settings.

// Predefined stamps for the initial collection
let stamps = [
    { name: 'Blue Penny', description: 'A famous stamp from Mauritius, issued in 1847.', year: 1847, imageUrl: 'images/blue-penny.jpg' },
    { name: 'Inverted Jenny', description: 'A US stamp featuring an upside-down airplane, issued in 1918.', year: 1918, imageUrl: 'images/inverted-jenny.png' },
    { name: 'Penny Black', description: 'The world’s first adhesive stamp, issued in 1840 in the UK.', year: 1840, imageUrl: 'images/penny-black.png' },
];

// Function to render the stamp collection
function renderStamps() {
    const stampCollectionDiv = document.getElementById('stampCollection');
    stampCollectionDiv.innerHTML = stamps.map(stamp => {
        // Dynamically build the stamp's HTML
        let stampHtml = `
            <div>
                <p><strong>${stamp.name}</strong> (${stamp.year}): ${stamp.description}</p>
        `;

        // Only add the image if a valid URL is present
        if (stamp.imageUrl) {
            stampHtml += `<img src="${stamp.imageUrl}" alt="${stamp.name}" />`;
        }

        stampHtml += `</div>`;
        return stampHtml;
    }).join('');
}

// Function to handle adding a new stamp
function addStamp(stampName, stampDescription, stampYear, stampImageUrl) {
    // Add the new stamp to the collection
    stamps.push({
        name: stampName,
        description: stampDescription,
        year: stampYear,
        imageUrl: stampImageUrl || null
    });

    // Confirm addition and update the collection
    document.getElementById('confirmationMessage').textContent = `Stamp "${stampName}" added successfully!`;
    renderStamps();
}

document.getElementById('addStampForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const stampName = document.getElementById('stampName').value;
    const stampDescription = document.getElementById('stampDescription').value;
    const stampYear = document.getElementById('stampYear').value;
    const stampImageUrl = document.getElementById('stampImageUrl').value;

    addStamp(stampName, stampDescription, stampYear, stampImageUrl);
});

if ('agent' in window) {
    window.agent.provideContext({
        tools: [
            {
                name: "add-stamp",
                description: "Add a new stamp to the collection",
                params: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "The name of the stamp" },
                        description: { type: "string", description: "A brief description of the stamp" },
                        year: { type: "number", description: "The year the stamp was issued" },
                        imageUrl: { type: "string", description: "An optional image URL for the stamp" }
                    },
                    required: ["name", "description", "year"]
                },
            },
            {
                name: "search-stamp",
                description: "Search for stamps by name or year",
                params: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "The name of the stamp to search for" },
                        year: { type: "number", description: "The year of the stamp to search for" },
                    },
                },
            }
        ]
    });

    window.addEventListener('toolcall', async (e) => {
        if (e.name === 'add-stamp') {
            const { name, description, year, imageUrl } = e.input;
            addStamp(name, description, year, imageUrl);

            return e.respondWith({
                content: [
                    {
                        type: "text",
                        text: `Stamp "${name}" added successfully! The collection now contains ${stamps.length} stamps.`,
                    },
                ]
            });
        } else if (e.name === 'search-stamp') {
            const { name, year } = e.input;
        
            // Filter stamps by name or year
            const results = stamps.filter((stamp) =>
                (name && stamp.name.toLowerCase().includes(name.toLowerCase())) ||
                (year && stamp.year === year)
            );

            if (results.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "No stamps found matching the search criteria.",
                        },
                    ],
                };
            }

            // Format results for MCP
            const formattedResults = results.map((stamp) => ({
                name: stamp.name,
                year: stamp.year,
                description: stamp.description,
                imageUrl: stamp.imageUrl || "No image available",
            }));

            const responseText = formattedResults
                .map(
                    (stamp) =>
                        `Name: ${stamp.name}\nYear: ${stamp.year}\nDescription: ${stamp.description}\nImage: ${stamp.imageUrl}\n---`
                )
                .join("\n");

            // Prepare content array starting with text
            const content = [
                {
                    type: "text",
                    text: responseText,
                },
            ];

            // Add images for stamps that have imageUrl
            for (const stamp of results) {
                if (stamp.imageUrl && stamp.imageUrl !== "No image available") {
                    const imageData = await imageUrlToBase64(stamp.imageUrl);
                    if (imageData) {
                        content.push({
                            type: "image",
                            data: imageData.base64Data,
                            mimeType: imageData.mimeType,
                        });
                    }
                }
            }

            return e.respondWith({ content });
        }
    })
}

// Helper function to convert image URL to base64
async function imageUrlToBase64(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }
        
        const blob = await response.blob();
        const mimeType = blob.type || 'image/jpeg';
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Data = reader.result.split(',')[1];
                resolve({ base64Data, mimeType });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error converting image to base64:', error);
        return null;
    }
}

// Initial render of stamps
renderStamps();