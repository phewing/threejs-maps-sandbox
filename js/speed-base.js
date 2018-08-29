class speedBaseClass
{
  constructor(scene, visibility = false)
  {
    // By default visibility is true
    this.scene = scene;
    this.visibility = visibility;
  }

  set visible(visibility)
  {
    this.visibility = visibility;

    try
    {
      if (this.visibility)
      {
        this.geometry.visible = true;
      }
      else
      {
        this.geometry.visible = false;
      }

    }
    catch (e)
    {
      console.error(e);
    }
  }

  get visible()
  {
    return this.visibility;
  }

  sceneRemove()
  {
    if (this.geometry)
    {
      this.scene.remove(this.geometry);
    }
  }

  sceneAdd()
  {
    if (this.geometry)
    {
      this.geometry.visible = this.visibility;
      this.scene.add(this.geometry);
    }
  }
}