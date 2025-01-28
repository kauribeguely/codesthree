// Get all elements with the class 'codestext'
  const codestextElements = document.querySelectorAll('.codestext');
  const maxDegreeAnim = 20;

  codestextElements.forEach((element) => {
    // Apply perspective and transform-style to the direct child
    const directChild = element.children[0];
    if (directChild) {
      directChild.style.perspective = "1000px";
      directChild.style.transformStyle = "preserve-3d";

      // Get the grandchild and ensure it's not a <style> tag
      let grandChild = Array.from(directChild.children).find(child => child.tagName.toLowerCase() !== "style");

      if (grandChild) {
        // Duplicate the valid grandchild twice
        for (let i = 0; i < 50; i++) {
          const duplicate = grandChild.cloneNode(true);
          duplicate.style.transform = `translateZ(${-5 * (i + 1)}px)`;
            duplicate.style.position = "absolute";
            duplicate.style.top = "0";
            duplicate.style.color = "gray";
          directChild.appendChild(duplicate);
        }
      }

      // Add mousemove listener to rotate the first child
      document.addEventListener("mousemove", (event) => {
          const x = (event.clientX / window.innerWidth - 0.5) * 2;
          const y = (event.clientY / window.innerHeight - 0.5) * 2;

          directChild.style.transform = `rotateX(${y * maxDegreeAnim}deg) rotateY(${x * maxDegreeAnim}deg)`;
        });

    }
  });
